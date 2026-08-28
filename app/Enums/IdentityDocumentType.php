<?php

namespace App\Enums;

/**
 * What kind of proof the `id_document` upload on Tenant/LandlordDetail
 * actually is — distinct from Category/CategoryType::Document, which
 * categorizes general document *files* (e.g. a fire safety certificate),
 * not a person or company's own identity proof.
 */
enum IdentityDocumentType: string
{
    case NationalId = 'national_id';
    case Passport = 'passport';
    case CompanyRegistrationCertificate = 'company_registration_certificate';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::NationalId => 'National ID',
            self::Passport => 'Passport',
            self::CompanyRegistrationCertificate => 'Company registration certificate',
            self::Other => 'Other',
        };
    }
}
