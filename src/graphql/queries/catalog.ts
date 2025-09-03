/**
 * Catalog GraphQL queries for products, categories, and collections
 * Minimal working version that matches tested Fynd GraphQL API
 */

import { gql } from '@apollo/client/core';
import {
  PRODUCT_BASIC_FRAGMENT,
  PAGINATION_FRAGMENT,
  MEDIA_FRAGMENT,
} from '../fragments/common';

/**
 * Get products listing (PLP) - tested and working
 */
export const GET_PRODUCTS = gql`
  query GetProducts(
    $search: String
    $sortOn: String
    $pageNo: Int
    $pageType: String
  ) {
    products(
      search: $search
      sortOn: $sortOn
      pageNo: $pageNo
      pageType: $pageType
    ) {
      items {
        ...ProductBasicFragment
      }
      page {
        ...PaginationFragment
      }
    }
  }
  ${PRODUCT_BASIC_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

/**
 * Get product by slug - minimal working version
 */
export const GET_PRODUCT = gql`
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      uid
      name
      slug
      short_description
      description
      brand {
        name
        uid
        logo {
          url
          alt
        }
      }
      media {
        ...MediaFragment
      }
      attributes
      has_variant
      item_code
      item_type
      product_online_date
      rating
      rating_count
      sellable
      tags
      highlights
      color
      discount
      sizes {
        discount
        multi_size
        sellable
        size_chart {
          title
          description
          image
          size_tip
        }
        size_details {
          display
          value
          is_available
          quantity
          seller_identifiers
        }
        stores {
          count
        }
        price {
          effective {
            currency_code
            currency_symbol
            max
            min
          }
          marked {
            currency_code
            currency_symbol
            max
            min
          }
        }
      }
      price {
        effective {
          currency_code
          currency_symbol
          max
          min
        }
        marked {
          currency_code
          currency_symbol
          max
          min
        }
      }
      grouped_attributes {
        title
        details {
          key
          type
          value
        }
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

/**
 * Get brands - minimal version
 */
export const GET_BRANDS = gql`
  query GetBrands($pageNo: Int) {
    brands(pageNo: $pageNo) {
      items {
        uid
        name
        slug
        description
      }
      page {
        ...PaginationFragment
      }
    }
  }
  ${PAGINATION_FRAGMENT}
`;

/**
 * Get home products - tested working
 */
export const GET_HOME_PRODUCTS = gql`
  query GetHomeProducts($pageNo: Int) {
    homeProducts(pageNo: $pageNo) {
      items {
        ...ProductBasicFragment
      }
      page {
        ...PaginationFragment
      }
    }
  }
  ${PRODUCT_BASIC_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

/**
 * Get categories - working query
 */
export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      data {
        department
      }
    }
  }
`;

/**
 * Get category by slug - fallback to empty query
 */
export const GET_CATEGORY = gql`
  query GetCategory($slug: String!) {
    _empty
  }
`;

/**
 * Get category products - using home products for now
 */
export const GET_CATEGORY_PRODUCTS = gql`
  query GetCategoryProducts(
    $slug: String!
    $pageNo: Int
  ) {
    homeProducts(pageNo: $pageNo) {
      items {
        ...ProductBasicFragment
      }
      page {
        ...PaginationFragment
      }
    }
  }
  ${PRODUCT_BASIC_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

/**
 * Get collections - fallback to empty query
 */
export const GET_COLLECTIONS = gql`
  query GetCollections($pageNo: Int) {
    _empty
  }
`;

/**
 * Get collection by slug - fallback to empty query
 */
export const GET_COLLECTION = gql`
  query GetCollection($slug: String!) {
    _empty
  }
`;

/**
 * Get collection products - fallback to home products
 */
export const GET_COLLECTION_PRODUCTS = gql`
  query GetCollectionProducts(
    $slug: String!
    $pageNo: Int
  ) {
    homeProducts(pageNo: $pageNo) {
      items {
        ...ProductBasicFragment
      }
      page {
        ...PaginationFragment
      }
    }
  }
  ${PRODUCT_BASIC_FRAGMENT}
  ${PAGINATION_FRAGMENT}
`;

/**
 * Search products - minimal version
 */
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($query: String!) {
    searchProduct(query: $query) {
      items {
        type
        action {
          type
        }
      }
    }
  }
`;

/**
 * Get product price by size - for dynamic pricing on PDP
 * Fetches size-specific pricing information including discounts, delivery promise, etc.
 */
export const GET_PRODUCT_PRICE = gql`
  query ProductPrice($slug: String!, $size: String!, $pincode: String!) {
    productPrice(slug: $slug, size: $size, pincode: $pincode) {
      article_id
      discount
      is_cod
      is_gift
      item_type
      long_lat
      pincode
      quantity
      seller_count
      special_badge
      price_per_piece {
        currency_code
        currency_symbol
        effective
        marked
        selling
      }
      price {
        currency_code
        currency_symbol
        effective
        marked
        selling
      }
      price_per_unit {
        currency_code
        currency_symbol
        price
        unit
      }
      return_config {
        returnable
        time
        unit
      }
      seller {
        count
        name
        uid
      }
      set {
        quantity
      }
      store {
        uid
        name
        count
      }
      strategy_wise_listing {
        distance
        pincode
        quantity
        tat
      }
      grouped_attributes {
        title
        details {
          key
          type
          value
        }
      }
      article_assignment {
        level
        strategy
      }
      delivery_promise {
        max
        min
      }
      discount_meta {
        end
        start
        start_timer_in_minutes
        timer
      }
    }
  }
`;

/**
 * Get application configuration - storefront common details
 * Fetches app details, currencies, contact info, features, and other configurations
 */
export const GET_APPLICATION_CONFIGURATION = gql`
  query applicationConfiguration {
    applicationConfiguration {
      app_details {
        id
        description
        name
        app_type
        cache_ttl
        channel_type
        company_id
        created_at
        updated_at
        is_active
        is_internal
        owner
        token
        modified_at
        version
        slug
        mode
        status
      }
      app_currencies {
        application
        _id
        created_at
        modified_at
      }
      basic_details {
        id
        description
        name
        company_id
        slug
      }
      contact_info {
        id
        application
        copyright_text
        created_at
        updated_at
        version
      }
      features {
        id
        app
        created_at
        updated_at
        modified_at
        version
      }
      integration_tokens {
        id
        application
        created_at
        updated_at
        modified_at
        version
      }
      languages {
        code
        name
      }
      owner_info {
        id
        created_at
        description
        is_active
        name
        secret
        token
        mode
        slug
        status
      }
    }
  }
`;

/**
 * Get application content - legal information, SEO, support info
 * Fetches legal policies, announcements, SEO configuration, and support information
 */
export const GET_APPLICATION_CONTENT = gql`
  query applicationContent {
    applicationContent {
      announcements {
        announcements
        refresh_pages
        refresh_rate
      }
      landing_page {
        custom_json
        id
        application
        archived
        platform
        slug
      }
      legal_information {
        id
        application
        created_at
        policy
        returns
        shipping
        tnc
        updated_at
      }
      seo_configuration {
        id
        app
        cannonical_enabled
        created_at
        robots_txt
        sitemap_enabled
        updated_at
        additonal_sitemap
      }
      support_information {
        id
        application
        created
        created_at
        updated_at
      }
      tags {
        id
        attributes
        content
        name
        pages
        position
        sub_type
        type
        url
        compatible_engines
      }
    }
  }
`;