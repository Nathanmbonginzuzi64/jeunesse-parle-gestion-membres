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

    public function storeImage(UploadedFile $file, ?string $previousPath = null): string
    {
        $extension = $this->resolveImageExtension($file);
        $path = self::DIRECTORY.'/img-'.Str::random(24).'.'.$extension;

        Storage::disk(self::DISK)->put($path, file_get_contents($file->getRealPath()));

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
        Storage::disk(self::DISK)->put($path, file_get_contents($file->getRealPath()));

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

    public function mimeFor(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
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
}
