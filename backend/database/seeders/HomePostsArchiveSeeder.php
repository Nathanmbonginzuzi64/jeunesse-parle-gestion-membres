<?php

namespace Database\Seeders;

use App\Models\HomePost;
use App\Models\User;
use App\Enums\RoleSlug;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Importe l'archive campagne (jeunesseparle.cd) comme posts d'accueil déjà publiés,
 * gérables ensuite par le super administrateur.
 */
class HomePostsArchiveSeeder extends Seeder
{
    public function run(): void
    {
        $authorId = User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', RoleSlug::SuperAdmin->value))
            ->value('id');

        $campaignDir = $this->resolveCampaignDirectory();

        foreach ($this->archiveItems() as $index => $item) {
            $existing = HomePost::withTrashed()->where('source_key', $item['source_key'])->first();

            $imagePath = $existing?->image_path;
            if (! empty($item['image_file']) && $campaignDir) {
                $imagePath = $this->copyCampaignMedia($campaignDir, $item['image_file'], $imagePath);
            }

            $videoPath = $existing?->video_path;
            if (! empty($item['video_file']) && $campaignDir) {
                $videoPath = $this->copyCampaignMedia($campaignDir, $item['video_file'], $videoPath);
            }

            $payload = [
                'title' => $item['title'],
                'excerpt' => $item['excerpt'],
                'body' => $item['body'],
                'category' => $item['category'],
                'image_path' => $imagePath,
                'video_path' => $videoPath,
                'external_url' => null,
                'is_published' => true,
                'published_at' => $item['published_at'],
                'sort_order' => 100 - $index,
                'author_id' => $authorId,
                'source_key' => $item['source_key'],
                'deleted_at' => null,
            ];

            if ($existing) {
                if ($existing->trashed()) {
                    $existing->restore();
                }
                $existing->fill($payload)->save();
            } else {
                HomePost::query()->create($payload);
            }
        }

        // Retirer le post démo générique s'il existe encore sans source_key utile.
        HomePost::query()
            ->whereNull('source_key')
            ->where('title', 'Bienvenue sur Jeunesse Parle')
            ->delete();
    }

    /** @return list<array<string, mixed>> */
    private function archiveItems(): array
    {
        return [
            [
                'source_key' => 'archive:dialogue-national-prealables',
                'published_at' => '2026-08-14 10:00:00',
                'category' => 'Actualité',
                'title' => 'Dialogue national : Jeunesse Parle pose ses préalables et refuse toute récompense politique aux porteurs d\'armes',
                'excerpt' => 'Le coordonnateur et initiateur du mouvement Jeunesse Parle, Serge ETINKUM ANZA, présente sa vision d\'un dialogue national inclusif à Kinshasa.',
                'image_file' => 'actu-dialogue-national.jpg',
                'video_file' => 'actu-video-1.mp4',
                'body' => implode("\n\n", [
                    'Le coordonnateur et initiateur du mouvement Jeunesse Parle, Serge ETINKUM ANZA, a échangé à Kinshasa sur sa vision du dialogue national inclusif.',
                    'Jeunesse Parle pose des préalables clairs et refuse toute récompense politique aux porteurs d\'armes, afin de préserver un cadre républicain et pacifique pour la jeunesse congolaise.',
                    'Cette prise de position s\'inscrit dans la campagne citoyenne pour associer les jeunes au débat sur l\'avenir de la Constitution.',
                ]),
            ],
            [
                'source_key' => 'archive:deploiement-grand-bandundu',
                'published_at' => '2026-08-06 10:00:00',
                'category' => 'Campagne',
                'title' => 'Après Kinshasa, Lubumbashi et Kisangani, « Jeunesse Parle » poursuit son déploiement dans le Grand Bandundu',
                'excerpt' => 'Initié par Serge Etinkum ANZA, le mouvement poursuit son déploiement provincial et donne la parole à la jeunesse congolaise.',
                'image_file' => 'actu-bandundu.jpg',
                'video_file' => 'actu-video-2.mp4',
                'body' => implode("\n\n", [
                    'Après Kinshasa, Lubumbashi et Kisangani, le mouvement « Jeunesse Parle » poursuit son déploiement à travers les provinces, notamment dans le Grand Bandundu.',
                    'L\'objectif : structurer l\'écoute des jeunes, renforcer l\'engagement citoyen et préparer la participation au débat constitutionnel.',
                ]),
            ],
            [
                'source_key' => 'archive:idiofa-kwilu',
                'published_at' => '2026-08-02 10:00:00',
                'category' => 'Événement',
                'title' => 'Kwilu : à Idiofa, Serge Etinkum ANZA annonce l\'implantation de « Jeunesse Parle » et mobilise les jeunes',
                'excerpt' => 'En marge d\'un meeting populaire à Idiofa, le coordonnateur national livre un message tourné vers la jeunesse et l\'engagement citoyen.',
                'image_file' => 'serge-etinkum-2.jpg',
                'video_file' => null,
                'body' => implode("\n\n", [
                    'À Idiofa (Kwilu), Serge Etinkum ANZA a annoncé l\'implantation du mouvement Jeunesse Parle et mobilisé les jeunes autour de l\'engagement citoyen.',
                    'Le message insiste sur la dignité des jeunes, la participation pacifique et le rôle de la jeunesse dans les réformes du pays.',
                ]),
            ],
            [
                'source_key' => 'archive:complexe-sportif-garde',
                'published_at' => '2026-07-27 10:00:00',
                'category' => 'Actualité',
                'title' => 'Serge Etinkum Anza salue l\'encadrement de la jeunesse au complexe sportif et promet un appui en équipements',
                'excerpt' => 'Visite au complexe sportif omnisports de la « Cohésion nationale » au camp Tshatshi, avec un engagement d\'appui aux jeunes.',
                'image_file' => 'serge-etinkum-3.jpg',
                'video_file' => null,
                'body' => implode("\n\n", [
                    'Le président et initiateur du mouvement « Jeunesse Parle » a effectué une visite au complexe sportif omnisports de la Cohésion nationale, implanté au camp Tshatshi.',
                    'Il a salué l\'encadrement de la jeunesse et promis un appui en équipements pour renforcer les activités sportives et citoyennes.',
                ]),
            ],
        ];
    }

    private function resolveCampaignDirectory(): ?string
    {
        $candidates = [
            base_path('../web/public/campaign'),
            dirname(base_path()).'/web/public/campaign',
        ];

        foreach ($candidates as $path) {
            if (is_dir($path)) {
                return realpath($path) ?: $path;
            }
        }

        return null;
    }

    private function copyCampaignMedia(string $campaignDir, string $filename, ?string $previousPath): ?string
    {
        $source = $campaignDir.DIRECTORY_SEPARATOR.$filename;
        if (! is_file($source)) {
            return $previousPath;
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION) ?: 'bin');
        $target = 'home-posts/archive-'.Str::slug(pathinfo($filename, PATHINFO_FILENAME)).'-'.Str::random(8).'.'.$extension;

        Storage::disk('local')->put($target, File::get($source));

        if ($previousPath && $previousPath !== $target) {
            Storage::disk('local')->delete($previousPath);
        }

        return $target;
    }
}
