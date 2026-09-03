<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Champs jamais recopiés dans le journal, même si le modèle les expose.
     */
    private const REDACTED = [
        'password', 'remember_token', 'two_factor_secret', 'token',
        'template_reference', 'api_token',
    ];

    public function log(
        string $action,
        ?Model $subject = null,
        ?string $description = null,
        array $oldValues = [],
        array $newValues = [],
    ): AuditLog {
        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'auditable_type' => $subject ? $subject::class : null,
            'auditable_id' => $subject?->getKey(),
            'description' => $description,
            'old_values' => $this->redact($oldValues) ?: null,
            'new_values' => $this->redact($newValues) ?: null,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::userAgent(), 0, 255),
            'portal' => $this->resolvePortal(),
            'request_path' => $this->resolveRequestPath(),
        ]);
    }

    /** Journalise uniquement les attributs réellement modifiés. */
    public function logChanges(string $action, Model $subject, array $before, ?string $description = null): AuditLog
    {
        $after = $subject->getAttributes();
        $changed = array_keys(array_diff_assoc(
            array_map(fn ($v) => is_scalar($v) || $v === null ? $v : json_encode($v), $after),
            array_map(fn ($v) => is_scalar($v) || $v === null ? $v : json_encode($v), $before),
        ));

        return $this->log(
            $action,
            $subject,
            $description,
            array_intersect_key($before, array_flip($changed)),
            array_intersect_key($after, array_flip($changed)),
        );
    }

    /**
     * Identifie le portail d'origine (web, mobile, api, system)
     * via l'en-tête X-Client-Portal, sinon heuristique User-Agent.
     */
    public function resolvePortal(): string
    {
        $header = strtolower(trim((string) Request::header('X-Client-Portal', '')));
        if (in_array($header, ['web', 'mobile', 'api', 'system'], true)) {
            return $header;
        }

        $ua = strtolower((string) Request::userAgent());

        if (
            str_contains($ua, 'jp-mobile')
            || str_contains($ua, 'jeunesse-parle-mobile')
            || str_contains($ua, 'expo')
            || str_contains($ua, 'okhttp')
            || str_contains($ua, 'reactnative')
            || str_contains($ua, 'react-native')
            || (str_contains($ua, 'darwin') && str_contains($ua, 'cfnetwork') && ! str_contains($ua, 'mozilla'))
        ) {
            return 'mobile';
        }

        if (
            str_contains($ua, 'mozilla')
            || str_contains($ua, 'chrome')
            || str_contains($ua, 'safari')
            || str_contains($ua, 'firefox')
            || str_contains($ua, 'edg/')
            || str_contains($ua, 'opr/')
        ) {
            return 'web';
        }

        if (! Request::hasHeader('User-Agent') && ! Auth::check()) {
            return 'system';
        }

        return Auth::check() ? 'api' : 'system';
    }

    private function resolveRequestPath(): ?string
    {
        $method = strtoupper((string) Request::method());
        $path = '/'.ltrim((string) Request::path(), '/');

        if ($path === '/' || $path === '') {
            return null;
        }

        return substr("{$method} {$path}", 0, 180);
    }

    private function redact(array $values): array
    {
        foreach (self::REDACTED as $key) {
            if (array_key_exists($key, $values)) {
                $values[$key] = '[masqué]';
            }
        }

        return $values;
    }
}
