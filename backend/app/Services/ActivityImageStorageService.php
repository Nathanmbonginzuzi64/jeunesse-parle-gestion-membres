<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stockage des images de couverture des activités (disque privé).
 */
class ActivityImageStorageService
{
    private const DISK = 'local';
    private const DIRECTORY = 'activities/images';

    private const SIGNATURES = [
        'jpg' => ["\xFF\xD8\xFF"],
        'png' => ["\x89PNG\r\n\x1A\n"],
        'webp' => ['RIFF'],
    ];

    public function store(UploadedFile $file, string $activityCode, ?string $previousPath = null): string
    {
        $extension = $this->resolveExtension($file);
        $path = self::DIRECTORY.'/'.$activityCode.'-'.Str::random(24).'.'.$extension;

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
            default => 'image/jpeg',
        };
    }

    private function resolveExtension(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'rb');
        $header = (string) fread($handle, 16);
        fclose($handle);

        foreach (self::SIGNATURES as $extension => $magics) {
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
