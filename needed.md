1. When adding a unit, the validation silently fails for media
``"errors": {
            "photos.1": "The photos.1 failed to upload."
        },
``

2. We need an preview that doesnt open in a new tab but in app like a lighthouse and we can see all images gallery in both units and properties,
3. When viewing the peroperties and unites, the images will have like a slide show for the images section when morethan one, and on clicking one it opens in a light house.

4. We need to properly arrange the details page for units, and properties
For units:
 - Units deserve a details attribute incase an admin wants to add notes
 - In the details page, we are to have the following arrangement, slideshow on the left and details on the right arranged in nicecards
 - Below we add tabs, where we include the current tenant, past tenants
 -- payments history,
 -- list of leases on that property
 -- performance of that unit
 -- maintenance history
 -- this page should give details to the owner

For propertiees
 - In the details page, we are to have the following arrangement, slideshow on the left and details on the right arranged in nicecards
 - The location should be shown well with out leaflet, we need a get directions page that can open in google maps because leaflet lets us pick the right address and can be used in google maps 
 - Below it we should have tabs, 
 -- Units tab that lists units available to that property
 -- landlord tab showing landlord details and contacts
 -- performance of this property, insiht and reports


 5. All users  and tenants should have an avatar that is nullable but default to name initials
 6. Improve the lease details page to be more informative and beautiful
 7. For all required fields, we need the red asterick component that indicates a field as required, and when validating with zod, it should focus on one of the invalid fields automatically to improve ui/ux
 9. Improve ui for maintenace details page to be well organized and informative
 10. documents, we should only allow, pdf, docx, ppt, txt, images-jpeg,png, webp, avi, jpg, gif, svg and max 5mbs
 11. For messages, weneed to discuss about incoming how we shall use that feature, also we need to add messaging using email too
    -- we need a view details this can be a right panel that shows the message details i.e what was sent, who sent, receipients and datae ..etc, no need for new page
12. Need an income and expenses details rightbar panel too
13. Implementation of the notifications page and notification on the header
14. Remove the trash icon on the sidebar
15. Sidebar should be filterable
16. Implement the search model, search results page

