/**
 * Catalog GraphQL queries for products, categories, and collections
 * Minimal working version that matches tested Fynd GraphQL API
 */

import { gql } from '@apollo/client';
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