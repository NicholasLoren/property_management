<?php

namespace Tests\Unit;

use App\Models\CodeSequence;
use App\Models\Property;
use App\Services\CodeGenerator;
use App\Settings\CodesSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodeGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function settings(array $overrides = []): CodesSettings
    {
        $settings = new CodesSettings;
        $settings->property_prefix = 'PROP';
        $settings->property_template = '{prefix}-{seq:4}';
        $settings->unit_prefix = 'UNIT';
        $settings->unit_template = '{prefix}-{seq:4}';
        $settings->document_prefix = 'DOC';
        $settings->document_template = '{prefix}-{date:Y}-{seq:4}';
        $settings->expense_prefix = 'EXP';
        $settings->expense_template = '{prefix}-{seq:4}';
        $settings->income_prefix = 'INC';
        $settings->income_template = '{prefix}-{seq:4}';

        foreach ($overrides as $key => $value) {
            $settings->{$key} = $value;
        }

        return $settings;
    }

    public function test_generate_renders_prefix_and_zero_padded_sequence(): void
    {
        $generator = new CodeGenerator($this->settings());

        $this->assertSame('PROP-0001', $generator->generate('property'));
        $this->assertSame('PROP-0002', $generator->generate('property'));
    }

    public function test_sequences_are_independent_per_type(): void
    {
        $generator = new CodeGenerator($this->settings());

        $generator->generate('property');
        $generator->generate('property');

        $this->assertSame('UNIT-0001', $generator->generate('unit'));
    }

    public function test_date_token_renders_the_current_year(): void
    {
        $generator = new CodeGenerator($this->settings());

        $this->assertSame('DOC-'.now()->format('Y').'-0001', $generator->generate('document'));
    }

    public function test_id_token_resolves_from_the_given_model(): void
    {
        $generator = new CodeGenerator($this->settings(['property_template' => '{prefix}-{id}']));
        $property = Property::factory()->create();

        $this->assertSame("PROP-{$property->id}", $generator->generate('property', $property));
        $this->assertTrue($generator->usesId('property'));
        $this->assertFalse($generator->usesId('unit'));
    }

    public function test_id_token_falls_back_to_sequence_when_no_model_is_given(): void
    {
        $generator = new CodeGenerator($this->settings(['property_template' => '{prefix}-{id}']));

        $this->assertSame('PROP-0001', $generator->generate('property'));
    }

    public function test_unknown_token_is_left_as_literal_text(): void
    {
        $generator = new CodeGenerator($this->settings(['property_template' => '{prefix}-{bogus}']));

        $this->assertSame('PROP-{bogus}', $generator->generate('property'));
    }

    public function test_sequence_increments_are_persisted_across_generator_instances(): void
    {
        (new CodeGenerator($this->settings()))->generate('property');
        (new CodeGenerator($this->settings()))->generate('property');

        $this->assertSame(3, CodeSequence::query()->where('type', 'property')->value('next_number'));
    }
}
