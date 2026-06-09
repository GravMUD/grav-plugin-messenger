<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;

/**
 * Form builder — survey / lead gen / booking templates (Pro).
 */
class MudMessengerForms
{
    private Grav $grav;
    private string $dir;

    public function __construct(Grav $grav)
    {
        $this->grav = $grav;
        $this->dir = GRAV_ROOT . '/user/data/mud-messenger/forms';
    }

    public function isEnabled(): bool
    {
        if ((string) MudMessengerConfig::get($this->grav, 'edition', 'lite') !== 'pro') {
            return false;
        }

        return (bool) MudMessengerConfig::get($this->grav, 'forms_enabled', false);
    }

    /** @return array<string, array<string, mixed>> */
    public static function templates(): array
    {
        return [
            'survey' => [
                'label' => 'Survey',
                'description' => 'Multi-question poll for ops or community feedback.',
                'fields' => [
                    ['id' => 'rating', 'type' => 'radio', 'label' => 'Overall rating', 'required' => true, 'options' => ['Excellent', 'Good', 'Okay', 'Poor']],
                    ['id' => 'favourite', 'type' => 'text', 'label' => 'What did you like most?', 'required' => false],
                    ['id' => 'improve', 'type' => 'textarea', 'label' => 'What could we improve?', 'required' => false],
                ],
            ],
            'lead_gen' => [
                'label' => 'Lead capture',
                'description' => 'Name, email, and interest — Constant Contact ready.',
                'fields' => [
                    ['id' => 'name', 'type' => 'text', 'label' => 'Full name', 'required' => true],
                    ['id' => 'email', 'type' => 'email', 'label' => 'Email', 'required' => true],
                    ['id' => 'interest', 'type' => 'select', 'label' => 'I am interested in', 'required' => true, 'options' => ['GetGRAV! meetup', 'GravFans Messenger Pro', 'Swag / merch', 'Partnership']],
                    ['id' => 'message', 'type' => 'textarea', 'label' => 'Message (optional)', 'required' => false],
                ],
            ],
            'booking' => [
                'label' => 'Booking request',
                'description' => 'Schedule a slot — meetups, demos, or office hours.',
                'fields' => [
                    ['id' => 'name', 'type' => 'text', 'label' => 'Your name', 'required' => true],
                    ['id' => 'email', 'type' => 'email', 'label' => 'Email', 'required' => true],
                    ['id' => 'date', 'type' => 'date', 'label' => 'Preferred date', 'required' => true],
                    ['id' => 'slot', 'type' => 'select', 'label' => 'Time slot', 'required' => true, 'options' => ['Morning', 'Afternoon', 'Evening']],
                    ['id' => 'notes', 'type' => 'textarea', 'label' => 'Notes', 'required' => false],
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function listForms(): array
    {
        if (!$this->isEnabled()) {
            return ['ok' => true, 'forms' => [], 'templates' => self::templates()];
        }

        $items = [];
        foreach ($this->configuredForms() as $form) {
            if (empty($form['enabled'])) {
                continue;
            }
            $items[] = $this->publicForm($form);
        }

        return ['ok' => true, 'forms' => $items, 'templates' => self::templates()];
    }

    /** @return array<string, mixed> */
    public function getForm(string $formId): array
    {
        $form = $this->resolveForm($formId);
        if ($form === null) {
            throw new \InvalidArgumentException('Unknown form.');
        }

        return ['ok' => true, 'form' => $this->publicForm($form)];
    }

    /** @return array<string, mixed> */
    public function submitForm(string $formId, array $payload): array
    {
        if (!$this->isEnabled()) {
            throw new \InvalidArgumentException('Forms disabled.');
        }

        $form = $this->resolveForm($formId);
        if ($form === null || empty($form['enabled'])) {
            throw new \InvalidArgumentException('Unknown form.');
        }

        $author = trim((string) ($payload['author'] ?? 'anon'));
        $answers = is_array($payload['answers'] ?? null) ? $payload['answers'] : [];
        $validated = $this->validateAnswers($form, $answers);

        $response = [
            'id' => 'rsp_' . bin2hex(random_bytes(8)),
            'formId' => (string) $form['id'],
            'author' => substr($author, 0, 32),
            'answers' => $validated,
            'ts' => gmdate('c'),
        ];

        $dir = $this->dir . '/' . $form['id'];
        $this->ensureDir($dir);
        $file = $dir . '/responses.json';
        $rows = $this->readJson($file);
        $rows[] = $response;
        $this->writeJson($file, $rows);

        return ['ok' => true, 'response' => $response];
    }

    /** @return array<string, mixed> form snapshot for chat message */
    public function snapshot(string $formId): array
    {
        $form = $this->resolveForm($formId);
        if ($form === null || empty($form['enabled'])) {
            throw new \InvalidArgumentException('Unknown form.');
        }

        return $this->publicForm($form);
    }

    /** @param array<string, mixed> $answers
     *  @return array<string, mixed>
     */
    private function validateAnswers(array $form, array $answers): array
    {
        $out = [];
        foreach ($form['fields'] as $field) {
            if (!is_array($field)) {
                continue;
            }
            $id = (string) ($field['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $val = isset($answers[$id]) ? trim((string) $answers[$id]) : '';
            if (!empty($field['required']) && $val === '') {
                throw new \InvalidArgumentException('Required field: ' . ($field['label'] ?? $id));
            }
            if ($val !== '' && ($field['type'] ?? '') === 'email' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                throw new \InvalidArgumentException('Invalid email.');
            }
            $out[$id] = $val;
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function configuredForms(): array
    {
        $rows = MudMessengerConfig::get($this->grav, 'forms');
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $built = $this->buildFormRow($row);
            if ($built !== null) {
                $out[] = $built;
            }
        }

        return $out;
    }

    /** @param array<string, mixed> $row
     *  @return array<string, mixed>|null
     */
    private function buildFormRow(array $row): ?array
    {
        $id = preg_replace('/[^a-z0-9_-]/', '', strtolower(trim((string) ($row['id'] ?? '')))) ?? '';
        if ($id === '') {
            return null;
        }

        $template = strtolower(trim((string) ($row['template'] ?? 'survey')));
        $templates = self::templates();
        $base = $templates[$template]['fields'] ?? [];

        $fields = $base;
        if (!empty($row['fields']) && is_array($row['fields'])) {
            $fields = [];
            foreach ($row['fields'] as $f) {
                if (!is_array($f) || empty($f['id'])) {
                    continue;
                }
                $options = [];
                if (!empty($f['options'])) {
                    $options = is_array($f['options']) ? $f['options'] : array_map('trim', explode(',', (string) $f['options']));
                }
                $fields[] = [
                    'id' => (string) $f['id'],
                    'type' => (string) ($f['type'] ?? 'text'),
                    'label' => (string) ($f['label'] ?? $f['id']),
                    'required' => !empty($f['required']),
                    'options' => $options,
                ];
            }
        }

        return [
            'id' => $id,
            'title' => (string) ($row['title'] ?? ucfirst(str_replace('-', ' ', $id))),
            'template' => $template,
            'templateLabel' => (string) ($templates[$template]['label'] ?? $template),
            'intro' => (string) ($row['intro'] ?? ''),
            'enabled' => !isset($row['enabled']) || !empty($row['enabled']),
            'fields' => $fields,
        ];
    }

    /** @return array<string, mixed>|null */
    private function resolveForm(string $formId): ?array
    {
        $formId = preg_replace('/[^a-z0-9_-]/', '', strtolower(trim($formId))) ?? '';
        foreach ($this->configuredForms() as $form) {
            if (($form['id'] ?? '') === $formId) {
                return $form;
            }
        }

        return null;
    }

    /** @param array<string, mixed> $form
     *  @return array<string, mixed>
     */
    private function publicForm(array $form): array
    {
        return [
            'id' => $form['id'],
            'title' => $form['title'],
            'template' => $form['template'],
            'templateLabel' => $form['templateLabel'],
            'intro' => $form['intro'],
            'fields' => $form['fields'],
        ];
    }

    /** @return list<mixed> */
    private function readJson(string $file): array
    {
        if (!is_readable($file)) {
            return [];
        }
        $data = json_decode((string) file_get_contents($file), true);
        return is_array($data) ? $data : [];
    }

    /** @param list<mixed> $data */
    private function writeJson(string $file, array $data): void
    {
        $this->ensureDir(dirname($file));
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Could not encode form data.');
        }
        file_put_contents($file, $json, LOCK_EX);
    }

    private function ensureDir(string $dir): void
    {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}
