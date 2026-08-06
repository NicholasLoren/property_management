<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Thin server-side proxy for OpenStreetMap's Nominatim geocoder, used by
 * the AddressMapPicker (property form, and any future form needing an
 * address). Proxied rather than called from the browser so we can send a
 * proper identifying User-Agent and cache results, per Nominatim's usage
 * policy (https://operations.osmfoundation.org/policies/nominatim/).
 */
class GeocodingController extends Controller
{
    private const USER_AGENT = 'Steward Property Management (contact: lorennicosir@gmail.com)';

    public function search(Request $request): JsonResponse
    {
        $query = $request->string('q')->trim()->value();

        if ($query === '') {
            return response()->json([]);
        }

        /** @var array<int, array<string, mixed>> $results */
        $results = Cache::remember(
            'geocode:search:'.md5($query),
            now()->addHour(),
            function () use ($query): array {
                /** @var array<int, array<string, mixed>>|null $body */
                $body = Http::withHeaders(['User-Agent' => self::USER_AGENT])
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $query,
                        'format' => 'jsonv2',
                        'limit' => 5,
                    ])
                    ->json();

                return $body ?? [];
            },
        );

        return response()->json(collect($results)->map(fn (array $result): array => [
            'label' => $result['display_name'],
            'latitude' => (float) $result['lat'],
            'longitude' => (float) $result['lon'],
        ])->all());
    }

    public function reverse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $latitude = $validated['latitude'];
        $longitude = $validated['longitude'];

        $result = Cache::remember(
            "geocode:reverse:{$latitude}:{$longitude}",
            now()->addHour(),
            fn () => Http::withHeaders(['User-Agent' => self::USER_AGENT])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'lat' => $latitude,
                    'lon' => $longitude,
                    'format' => 'jsonv2',
                ])
                ->json(),
        );

        return response()->json([
            'label' => $result['display_name'] ?? null,
        ]);
    }
}
