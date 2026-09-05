<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class HomePostMediaService
{
    private const DISK = 'local';
    private const DIRECTORY = 'home-posts';

    private const IMAGE_SIGNATURES = [
        'jpg' => ["\xFF\xD8\xFF"],
        'png' => ["\x89PNG\r\n\x1A\n"],
        'webp' => ['RIFF'],
    ];

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

    public function delete(?string $path): void
    {
        if ($path && Storage::disk(self::DISK)->exists($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public function absolutePath(string $path): ?string
    {
        if (! Storage::disk(self::DISK)->exists($path)) {
            return null;
        }

        return Storage::disk(self::DISK)->path($path);
    }

    private function resolveImageExtension(UploadedFile $file): string
    {
        $bytes = file_get_contents($file->getRealPath(), false, null, 0, 16) ?: '';

        foreach (self::IMAGE_SIGNATURES as $ext => $signatures) {
            foreach ($signatures as $signature) {
                if (str_starts_with($bytes, $signature)) {
                    if ($ext === 'webp' && ! str_contains(substr($bytes, 0, 12), 'WEBP')) {
                        continue;
                    }

                    return $ext;
                }
            }
        }

        throw ValidationException::withMessages([
            'image' => 'Image invalide. Formats acceptés : JPG, PNG, WEBP.',
        ]);
    }
}
