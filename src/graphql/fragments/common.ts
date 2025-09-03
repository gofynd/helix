/**
 * Common GraphQL fragments for reusable data structures
 * Updated to match current Fynd GraphQL API schema
 */

import { gql } from '@apollo/client/core';

/**
 * Media/Image fragment - matches actual API response
 */
export const MEDIA_FRAGMENT = gql`
  fragment MediaFragment on Media {
    url
  }
`;

/**
 * Price fragment - matches actual API structure
 */
export const PRICE_FRAGMENT = gql`
  fragment PriceFragment on ProductListingPriceDetails {
    effective {
      min
      max
      currency_code
    }
    marked {
      min
      max
      currency_code
    }
  }
`;

/**
 * Product basic info fragment - simplified for actual API
 */
export const PRODUCT_BASIC_FRAGMENT = gql`
  fragment ProductBasicFragment on ProductListingDetail {
    uid
    name
    slug
    brand {
      name
    }
    media {
      ...MediaFragment
    }
    price {
      ...PriceFragment
    }
  }
  ${MEDIA_FRAGMENT}
  ${PRICE_FRAGMENT}
`;

/**
 * Pagination fragment - matches actual API field names
 */
export const PAGINATION_FRAGMENT = gql`
  fragment PaginationFragment on PageInfo {
    current
    has_next
    has_previous
    item_total
    size
    type
  }
`;

/**
 * SEO fragment - simplified
 */
export const SEO_FRAGMENT = gql`
  fragment SEOFragment on SEODetails {
    title
    description
  }
`;