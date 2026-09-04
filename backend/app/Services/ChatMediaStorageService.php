<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ChatMediaStorageService
{
    private const DISK = 'local';
    private const DIRECTORY = 'jp-chat/attachments';

    public function store(UploadedFile $file): array
    {
        $kind = $this->kindOf($file);
        $extension = $this->extensionFor($file, $kind);
        $path = self::DIRECTORY.'/'.Str::random(28).'.'.$extension;

        $file->storeAs(dirname($path), basename($path), self::DISK);

        return [
            'path' => $path,
            'original_name' => Str::limit($file->getClientOriginalName(), 160, ''),
            'mime' => $this->mimeFor($path, $file->getMimeType()),
            'size' => (int) $file->getSize(),
            'kind' => $kind,
        ];
    }

    public function get(string $path): ?string
    {
        return Storage::disk(self::DISK)->exists($path)
            ? Storage::disk(self::DISK)->get($path)
            : null;
    }

    public function mimeFor(string $path, ?string $fallback = null): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'jpg', 'jpeg' => 'image/jpeg',
            'pdf' => 'application/pdf',
            'mp3' => 'audio/mpeg',
            'm4a', 'mp4' => 'audio/mp4',
            'aac' => 'audio/aac',
            'ogg' => 'audio/ogg',
            'webm' => 'audio/webm',
            'wav' => 'audio/wav',
            '3gp', '3gpp' => 'audio/3gpp',
            'caf' => 'audio/x-caf',
            default => $fallback ?: 'application/octet-stream',
        };
    }

    private function kindOf(UploadedFile $file): string
    {
        $mime = strtolower((string) ($file->getMimeType() ?: ''));
        $ext = strtolower((string) ($file->getClientOriginalExtension()
            ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION)));

        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }

        /*
         * Les enregistrements Expo / Android arrivent souvent en .m4a avec un MIME
         * détecté comme video/mp4, audio/mp4, application/octet-stream, etc.
         */
        $audioMimes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/mp4',
            'audio/x-m4a',
            'audio/m4a',
            'audio/aac',
            'audio/ogg',
            'audio/webm',
            'audio/wav',
            'audio/x-wav',
            'audio/3gpp',
            'audio/amr',
            'audio/x-caf',
            'video/mp4',
            'video/3gpp',
        ];
        $audioExts = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'webm', 'wav', '3gp', '3gpp', 'caf', 'mp4'];

        if (
            str_starts_with($mime, 'audio/')
            || in_array($mime, $audioMimes, true)
            || ($mime === 'application/octet-stream' && in_array($ext, $audioExts, true))
            || in_array($ext, $audioExts, true)
        ) {
            return 'audio';
        }

        if ($mime === 'application/pdf' || $ext === 'pdf') {
            return 'file';
        }

        throw ValidationException::withMessages([
            'file' => 'Fichier non autorisé. Images, PDF ou audio uniquement.',
        ]);
    }

    private function extensionFor(UploadedFile $file, string $kind): string
    {
        if ($kind === 'image') {
            $handle = fopen($file->getRealPath(), 'rb');
            $header = (string) fread($handle, 16);
            fclose($handle);

            if (str_starts_with($header, "\xFF\xD8\xFF")) {
                return 'jpg';
            }
            if (str_starts_with($header, "\x89PNG")) {
                return 'png';
            }
            if (str_starts_with($header, 'RIFF') && str_contains(substr($header, 8, 4), 'WEBP')) {
                return 'webp';
            }

            throw ValidationException::withMessages([
                'file' => 'Image invalide (JPEG, PNG ou WebP attendu).',
            ]);
        }

        if ($kind === 'file') {
            return 'pdf';
        }

        return match (strtolower($file->getClientOriginalExtension())) {
            'mp3' => 'mp3',
            'm4a', 'mp4' => 'm4a',
            'aac' => 'aac',
            'ogg', 'oga' => 'ogg',
            'webm' => 'webm',
            'wav' => 'wav',
            '3gp', '3gpp' => '3gp',
            'caf' => 'caf',
            default => 'm4a',
        };
    }
}
