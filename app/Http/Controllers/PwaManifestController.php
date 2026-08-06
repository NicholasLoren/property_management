<?php

namespace App\Http\Controllers;

use App\Support\Branding;
use Illuminate\Http\JsonResponse;

class PwaManifestController extends Controller
{
    public function show(): JsonResponse
    {
        $name = Branding::name();

        return response()->json([
            'name' => $name,
            'short_name' => $name,
            'description' => 'Property management, made simple.',
            'id' => '/',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => '#ffffff',
            'theme_color' => Branding::themeColor(),
            'icons' => [
                [
                    'src' => Branding::icon('icon-192', '/pwa-icons/icon-192.png'),
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => Branding::icon('icon-512', '/pwa-icons/icon-512.png'),
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src' => Branding::icon('icon-maskable-192', '/pwa-icons/icon-192-maskable.png'),
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'maskable',
                ],
                [
                    'src' => Branding::icon('icon-maskable-512', '/pwa-icons/icon-512-maskable.png'),
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'maskable',
                ],
            ],
        ])->header('Content-Type', 'application/manifest+json');
    }
}
