<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stockage des photos de membres.
 *
 * Les fichiers sont conservés sur le disque privé et servis uniquement via une
 * route contrôlée : jamais d'URL publique devinable. Le type réel est vérifié
 * à partir de la signature binaire, pas de l'extension fournie par le client.
 */
class PhotoStorageService
{
    private const DISK = 'local';
    private const DIRECTORY = 'members/photos';

    /** Signatures binaires acceptées, indexées par extension canonique. */
    private const SIGNATURES = [
        'jpg' => ["\xFF\xD8\xFF"],
        'png' => ["\x89PNG\r\n\x1A\n"],
        'webp' => ['RIFF'],
    ];

    public function store(UploadedFile $file, string $memberCode, ?string $previousPath = null): string
    {
        $extension = $this->resolveExtension($file);

        $path = self::DIRECTORY.'/'.$memberCode.'-'.Str::random(24).'.'.$extension;

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

    /**
     * Détermine l'extension à partir du contenu réel du fichier.
     * Une extension déclarée « .jpg » sur un fichier PHP est ainsi rejetée.
     */
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
            'photo' => 'Le fichier envoyé n\'est pas une image valide (JPEG, PNG ou WebP attendu).',
        ]);
    }
}
