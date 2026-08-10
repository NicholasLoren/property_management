<?php

namespace App\Support;

use App\Models\CompanyProfile;
use App\Settings\BrandingSettings;
use App\Settings\GeneralSettings;

/**
 * Resolves the company's white-label identity (name, theme, icons) from
 * Settings, for use anywhere branding needs to reach outside of a normal
 * Inertia page — the root Blade shell and the PWA manifest, which are both
 * requested before/without a client-side render.
 */
class Branding
{
    /**
     * The short display name for UI chrome — sidebar, browser tab title,
     * PWA manifest — distinct from `company_name`, which is the formal
     * business name used on invoices, receipts, and exported reports.
     */
    public static function name(): string
    {
        return app(GeneralSettings::class)->app_name;
    }

    public static function themeColor(): string
    {
        return app(BrandingSettings::class)->accent_color;
    }

    /**
     * The URL for a given app-icon conversion, falling back to the
     * bundled default asset when no custom icon has been uploaded.
     */
    public static function icon(string $conversion, string $fallbackPath): string
    {
        $media = CompanyProfile::current()->getFirstMedia('app_icon');

        if (! $media) {
            return $fallbackPath;
        }

        return $media->getUrl($conversion);
    }

    public static function hasCustomIcon(): bool
    {
        return CompanyProfile::current()->getFirstMedia('app_icon') !== null;
    }

    /**
     * The uploaded company logo, inlined as a base64 data URI so PDF
     * generation (DomPDF) can embed it without needing network/filesystem
     * access to the storage disk — null when no logo has been uploaded, so
     * callers can fall back to text-only branding.
     */
    public static function logoDataUri(): ?string
    {
        $media = CompanyProfile::current()->getFirstMedia('logo');

        if ($media === null) {
            return null;
        }

        $contents = file_get_contents($media->getPath());

        if ($contents === false) {
            return null;
        }

        return 'data:'.$media->mime_type.';base64,'.base64_encode($contents);
    }

    /**
     * The uploaded app icon's URL, for UI that wants to show the company's
     * mark in place of a generic logo (e.g. the sidebar) — null when
     * nothing's been uploaded, so callers can fall back to that icon.
     */
    public static function iconUrl(): ?string
    {
        $media = CompanyProfile::current()->getFirstMedia('app_icon');

        return $media?->getUrl('icon-192');
    }

    /**
     * The two brand colors an admin picks (Primary — every solid button;
     * Accent — active nav states, badges, focus rings) expand into the
     * app's full set of light/dark CSS custom properties. Admins pick one
     * hex per slot; every derived shade (soft tint, "strong" emphasis
     * text, contrast text on a filled background) is computed here so a
     * bad pairing can't produce unreadable text.
     *
     * @return array{light: array<string, string>, dark: array<string, string>}
     */
    public static function palette(): array
    {
        $branding = app(BrandingSettings::class);
        $primary = $branding->primary_color;
        $accent = $branding->accent_color;

        // Background luminance of each theme's page background, used to
        // keep a too-dark primary from vanishing on a dark background (and
        // vice versa) without touching colors that already read fine.
        $lightBg = self::relativeLuminance('#f5f6f3');
        $darkBg = self::relativeLuminance('#121613');

        $lightPrimary = self::ensureVisibleOn($primary, $lightBg);
        $darkPrimary = self::ensureVisibleOn($primary, $darkBg);
        $lightAccent = self::ensureVisibleOn($accent, $lightBg);
        $darkAccent = self::ensureVisibleOn($accent, $darkBg);

        return [
            'light' => [
                'primary' => $lightPrimary,
                'primary-foreground' => self::contrastText($lightPrimary),
                'accent-brand' => $lightAccent,
                'accent-strong' => self::mix($lightAccent, '#000000', 0.22),
                'accent-soft' => self::mix($lightAccent, '#ffffff', 0.87),
                'accent-contrast' => self::contrastText($lightAccent),
                'ring' => $lightAccent,
                'sidebar-primary' => $lightAccent,
                'sidebar-primary-foreground' => self::contrastText($lightAccent),
                'sidebar-accent' => self::mix($lightAccent, '#ffffff', 0.87),
                'sidebar-accent-foreground' => self::mix($lightAccent, '#000000', 0.22),
                'sidebar-ring' => $lightAccent,
            ],
            'dark' => [
                'primary' => $darkPrimary,
                'primary-foreground' => self::contrastText($darkPrimary),
                'accent-brand' => $darkAccent,
                'accent-strong' => self::mix($darkAccent, '#ffffff', 0.25),
                'accent-soft' => self::mix($darkAccent, '#1a211c', 0.82),
                'accent-contrast' => self::contrastText($darkAccent),
                'ring' => $darkAccent,
                'sidebar-primary' => $darkAccent,
                'sidebar-primary-foreground' => self::contrastText($darkAccent),
                'sidebar-accent' => self::mix($darkAccent, '#1a211c', 0.82),
                'sidebar-accent-foreground' => self::mix($darkAccent, '#ffffff', 0.25),
                'sidebar-ring' => $darkAccent,
            ],
        ];
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private static function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        return [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2)),
        ];
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $rgb
     */
    private static function rgbToHex(array $rgb): string
    {
        return sprintf(
            '#%02x%02x%02x',
            ...array_map(fn (float $channel): int => max(0, min(255, (int) round($channel))), $rgb),
        );
    }

    /**
     * Blends two hex colors. $weight of 0 returns $from, 1 returns $to.
     */
    private static function mix(string $from, string $to, float $weight): string
    {
        [$r1, $g1, $b1] = self::hexToRgb($from);
        [$r2, $g2, $b2] = self::hexToRgb($to);

        return self::rgbToHex([
            $r1 + ($r2 - $r1) * $weight,
            $g1 + ($g2 - $g1) * $weight,
            $b1 + ($b2 - $b1) * $weight,
        ]);
    }

    /**
     * WCAG relative luminance, 0 (black) to 1 (white).
     */
    private static function relativeLuminance(string $hex): float
    {
        [$r, $g, $b] = array_map(function (int $channel): float {
            $channel /= 255;

            return $channel <= 0.03928 ? $channel / 12.92 : (($channel + 0.055) / 1.055) ** 2.4;
        }, self::hexToRgb($hex));

        return 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
    }

    /**
     * Near-black or near-white — whichever reads on top of $hex.
     */
    private static function contrastText(string $hex): string
    {
        return self::relativeLuminance($hex) > 0.5 ? '#13181a' : '#f5f6f3';
    }

    /**
     * Nudges $hex away from a background it would otherwise blend into.
     * Colors that already contrast reasonably are returned untouched.
     */
    private static function ensureVisibleOn(string $hex, float $backgroundLuminance): string
    {
        $luminance = self::relativeLuminance($hex);

        if (abs($luminance - $backgroundLuminance) > 0.25) {
            return $hex;
        }

        return $backgroundLuminance > 0.5
            ? self::mix($hex, '#000000', 0.35)
            : self::mix($hex, '#ffffff', 0.35);
    }
}
