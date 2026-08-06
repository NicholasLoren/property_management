<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Image\Enums\AlignPosition;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Singleton row (always id 1) anchoring the company logo and app icon
 * media attachments.
 */
class CompanyProfile extends Model implements HasMedia
{
    use InteractsWithMedia;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('logo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

        $this->addMediaCollection('app_icon')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * Every size a browser or OS might ask for is derived from the single
     * uploaded app icon: browser favicon, iOS home screen icon, and the
     * PWA manifest icons (including padded "maskable" variants, whose
     * artwork must sit inside a safe zone since the OS may crop it to a
     * circle or squircle).
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('favicon-32')
            ->performOnCollections('app_icon')
            ->fit(Fit::Crop, 32, 32)
            ->format('png')
            ->nonQueued();

        $this->addMediaConversion('apple-touch-icon')
            ->performOnCollections('app_icon')
            ->fit(Fit::Crop, 180, 180)
            ->format('png')
            ->nonQueued();

        $this->addMediaConversion('icon-192')
            ->performOnCollections('app_icon')
            ->fit(Fit::Crop, 192, 192)
            ->format('png')
            ->nonQueued();

        $this->addMediaConversion('icon-512')
            ->performOnCollections('app_icon')
            ->fit(Fit::Crop, 512, 512)
            ->format('png')
            ->nonQueued();

        $this->addMediaConversion('icon-maskable-192')
            ->performOnCollections('app_icon')
            ->fit(Fit::Contain, 116, 116)
            ->resizeCanvas(192, 192, AlignPosition::Center, false, '#ffffff')
            ->format('png')
            ->nonQueued();

        $this->addMediaConversion('icon-maskable-512')
            ->performOnCollections('app_icon')
            ->fit(Fit::Contain, 308, 308)
            ->resizeCanvas(512, 512, AlignPosition::Center, false, '#ffffff')
            ->format('png')
            ->nonQueued();
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
