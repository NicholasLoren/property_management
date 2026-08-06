<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        @php
            $brandingName = \App\Support\Branding::name();
            $brandingThemeColor = \App\Support\Branding::themeColor();
            $brandingHasCustomIcon = \App\Support\Branding::hasCustomIcon();
            $brandingPalette = \App\Support\Branding::palette();
        @endphp

        @if ($brandingHasCustomIcon)
            <link rel="icon" href="{{ \App\Support\Branding::icon('favicon-32', '/favicon.svg') }}" type="image/png">
            <link rel="apple-touch-icon" href="{{ \App\Support\Branding::icon('apple-touch-icon', '/apple-touch-icon.png') }}">
        @else
            <link rel="icon" href="/favicon.ico" sizes="any">
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
            <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        @endif
        <link rel="manifest" href="/manifest.webmanifest">
        <meta name="theme-color" content="{{ $brandingThemeColor }}">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="{{ $brandingName }}">

        <script>
            window.__APP_NAME__ = @json($brandingName);
        </script>

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])

        {{-- Company branding colors, layered on top of the compiled Tailwind
             theme above so this cascade wins on equal specificity. --}}
        <style>
            :root {
                @foreach ($brandingPalette['light'] as $property => $value)
                    --{{ $property }}: {{ $value }};
                @endforeach
            }

            .dark {
                @foreach ($brandingPalette['dark'] as $property => $value)
                    --{{ $property }}: {{ $value }};
                @endforeach
            }
        </style>

        <x-inertia::head>
            <title>{{ $brandingName }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
