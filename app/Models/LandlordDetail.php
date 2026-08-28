<?php

namespace App\Models;

use App\Enums\IdentityDocumentType;
use App\Enums\PartyType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * Extra profile data that only makes sense once a user is onboarded as a
 * landlord (see SRS FR-1.1), but isn't restricted to the Landlord role at
 * the data layer — any user may have one.
 *
 * @property int $id
 * @property int $user_id
 * @property PartyType $type
 * @property string|null $id_number
 * @property string|null $tin
 * @property IdentityDocumentType|null $id_document_type
 * @property string|null $address
 * @property string|null $phone
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['type', 'id_number', 'tin', 'id_document_type', 'address', 'phone', 'notes'])]
class LandlordDetail extends Model implements HasMedia
{
    use InteractsWithMedia;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => PartyType::class,
            'id_document_type' => IdentityDocumentType::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('id_document')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    }
}
