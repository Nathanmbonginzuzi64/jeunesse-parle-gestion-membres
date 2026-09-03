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
            'mime' => $file->getMimeType() ?: 'application/octet-stream',
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
            'm4a' => 'audio/mp4',
            'ogg' => 'audio/ogg',
            'webm' => 'audio/webm',
            'wav' => 'audio/wav',
            default => $fallback ?: 'application/octet-stream',
        };
    }

    private function kindOf(UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();

        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'audio/')) {
            return 'audio';
        }
        if ($mime === 'application/pdf') {
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
            'm4a' => 'm4a',
            'ogg', 'oga' => 'ogg',
            'webm' => 'webm',
            'wav' => 'wav',
            default => 'm4a',
        };
    }
}
