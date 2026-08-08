<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CustomErrorPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_unknown_route_renders_the_custom_404_page(): void
    {
        $response = $this->get('/this-route-does-not-exist');

        $response->assertStatus(404);
        $response->assertSee('Page not found');
        $response->assertSee('/images/404_error.svg', false);
    }

    public function test_an_uncaught_exception_renders_the_custom_500_page_outside_debug_mode(): void
    {
        config(['app.debug' => false]);

        Route::get('/__test-throws', function () {
            throw new \RuntimeException('boom');
        });

        $response = $this->get('/__test-throws');

        $response->assertStatus(500);
        $response->assertSee('Something went wrong');
        $response->assertSee('/images/maintenance_web.svg', false);
    }

    public function test_maintenance_mode_renders_the_custom_503_page(): void
    {
        $this->artisan('down')->assertSuccessful();

        try {
            $response = $this->get('/dashboard');

            $response->assertStatus(503);
            $response->assertSee("We'll be right back", false);
            $response->assertSee('/images/maintenance_web.svg', false);
        } finally {
            $this->artisan('up')->assertSuccessful();
        }
    }
}
