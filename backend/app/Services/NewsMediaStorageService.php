<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class NewsMediaStorageService
{
    private const DISK = 'local';
    private const DIRECTORY = 'news/media';

    private const IMAGE_SIGNATURES = [
        'jpg' => ["\xFF\xD8\xFF"],
        'png' => ["\x89PNG\r\n\x1A\n"],
        'webp' => ['RIFF'],
    ];

    private const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

    public function storeImage(UploadedFile $file, ?string $previousPath = null): string
    {
        $extension = $this->resolveImageExtension($file);
        $path = self::DIRECTORY.'/img-'.Str::random(24).'.'.$extension;

        $file->storeAs(dirname($path), basename($path), self::DISK);

        if ($previousPath) {
            $this->delete($previousPath);
        }

        return $path;
    }

    public function storeVideo(UploadedFile $file, ?string $previousPath = null): string
    {
        $extension = $this->resolveVideoExtension($file);
        $path = self::DIRECTORY.'/vid-'.Str::random(24).'.'.$extension;

        $file->storeAs(dirname($path), basename($path), self::DISK);

        if ($previousPath) {
            $this->delete($previousPath);
        }

        return $path;
    }

    public function storeDocument(UploadedFile $file, ?string $previousPath = null): string
    {
        if ($file->getClientOriginalExtension() !== 'pdf' && $file->getMimeType() !== 'application/pdf') {
            throw ValidationException::withMessages([
                'document' => 'Seuls les fichiers PDF sont acceptés.',
            ]);
        }

        $path = self::DIRECTORY.'/doc-'.Str::random(24).'.pdf';
        $file->storeAs(dirname($path), basename($path), self::DISK);

        if ($previousPath) {
            $this->delete($previousPath);
        }

        return $path;
    }

    public function delete(?string $path): void
    {
        if ($path && Storage::disk(self::DISK)->exists($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public function get(string $path): ?string
    {
        return Storage::disk(self::DISK)->exists($path)
            ? Storage::disk(self::DISK)->get($path)
            : null;
    }

    public function absolutePath(string $path): ?string
    {
        if (! Storage::disk(self::DISK)->exists($path)) {
            return null;
        }

        return Storage::disk(self::DISK)->path($path);
    }

    public function mimeFor(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mov' => 'video/quicktime',
            default => 'image/jpeg',
        };
    }

    private function resolveImageExtension(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'rb');
        $header = (string) fread($handle, 16);
        fclose($handle);

        foreach (self::IMAGE_SIGNATURES as $extension => $magics) {
            foreach ($magics as $magic) {
                if (str_starts_with($header, $magic)) {
                    if ($extension === 'webp' && ! str_contains(substr($header, 8, 4), 'WEBP')) {
                        continue;
                    }

                    return $extension;
                }
            }
        }

        throw ValidationException::withMessages([
            'image' => 'Le fichier envoyé n\'est pas une image valide (JPEG, PNG ou WebP attendu).',
        ]);
    }

    private function resolveVideoExtension(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: '');
        $mime = (string) $file->getMimeType();

        $fromMime = match (true) {
            str_contains($mime, 'mp4') => 'mp4',
            str_contains($mime, 'webm') => 'webm',
            str_contains($mime, 'quicktime') => 'mov',
            default => null,
        };

        $resolved = $fromMime ?? (in_array($extension, self::VIDEO_EXTENSIONS, true) ? $extension : null);

        if (! $resolved) {
            throw ValidationException::withMessages([
                'video' => 'Formats vidéo acceptés : MP4, WebM ou MOV.',
            ]);
        }

        return $resolved;
    }
}
