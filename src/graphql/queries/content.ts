/**
 * Content GraphQL queries for pages, blogs, and application content
 * Minimal working version that matches Fynd GraphQL API
 */

import { gql } from '@apollo/client/core';

/**
 * Get home page content - fallback to empty query
 */
export const GET_HOME_CONTENT = gql`
  query GetHomeContent {
    _empty
  }
`;

/**
 * Get page by slug - minimal working version
 */
export const GET_PAGE = gql`
  query GetPage($slug: String!) {
    page(slug: $slug) {
      id
      title
      slug
      published
      tags
      date_meta {
        created_on
        modified_on
      }
    }
  }
`;

/**
 * Get blog by slug - minimal working version
 */
export const GET_BLOG = gql`
  query GetBlog($slug: String!) {
    blog(slug: $slug) {
      id
      title
      slug
      summary
      tags
      date_meta {
        created_on
        modified_on
      }
      published
    }
  }
`;

/**
 * Get navigation - fallback to empty query
 */
export const GET_NAVIGATION = gql`
  query GetNavigation {
    _empty
  }
`;

/**
 * Get banners - fallback to empty query
 */
export const GET_BANNERS = gql`
  query GetBanners($slug: String) {
    _empty
  }
`;

/**
 * Get application configuration - fallback to empty query
 */
export const GET_APP_CONFIG = gql`
  query GetAppConfig {
    _empty
  }
`;

/**
 * Get footer content - fallback to empty query
 */
export const GET_FOOTER = gql`
  query GetFooter {
    _empty
  }
`;

/**
 * Get languages - working version
 */
export const GET_LANGUAGES = gql`
  query GetLanguages {
    languages {
      name
    }
  }
`;

/**
 * Get currencies - working version
 */
export const GET_CURRENCIES = gql`
  query GetCurrencies {
    currencies {
      id
      is_active
      name
      code
      created_at
      updated_at
      decimal_digits
      symbol
    }
  }
`;