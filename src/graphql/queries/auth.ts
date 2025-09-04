/**
 * Authentication GraphQL mutations
 * Handles OTP and password-based authentication
 */

import { gql } from '@apollo/client/core';

/**
 * Login with OTP - Initial request to send OTP
 */
export const LOGIN_WITH_OTP = gql`
  mutation loginWithOTP(
    $platform: String
    $sendOtpRequestSchemaInput: SendOtpRequestSchemaInput
  ) {
    loginWithOTP(
      platform: $platform
      sendOtpRequestSchemaInput: $sendOtpRequestSchemaInput
    ) {
      country_code
      email
      message
      mobile
      register_token
      request_id
      resend_email_token
      resend_timer
      resend_token
      success
      user_exists
      verify_email_otp
      verify_mobile_otp
    }
  }
`;

/**
 * Verify OTP to complete login
 */
export const VERIFY_OTP = gql`
  mutation verifyMobileOTP(
    $platform: String
    $verifyOtpRequestSchemaInput: VerifyOtpRequestSchemaInput
  ) {
    verifyMobileOTP(
      platform: $platform
      verifyOtpRequestSchemaInput: $verifyOtpRequestSchemaInput
    ) {
      register_token
      user_exists
      user {
        id
        account_type
        active
        application_id
        created_at
        dob
        first_name
        gender
        last_name
        meta
        profile_pic_url
        updated_at
        user_id
        username
        emails {
          active
          email
          primary
          verified
        }
        phone_numbers {
          active
          country_code
          phone
          primary
          verified
        }
      }
    }
  }
`;

/**
 * Resend OTP on mobile
 */
export const RESEND_OTP_ON_MOBILE = gql`
  mutation sendOTPOnMobile(
    $platform: String
    $sendMobileOtpRequestSchemaInput: SendMobileOtpRequestSchemaInput
  ) {
    sendOTPOnMobile(
      platform: $platform
      sendMobileOtpRequestSchemaInput: $sendMobileOtpRequestSchemaInput
    ) {
      country_code
      message
      mobile
      register_token
      request_id
      resend_timer
      resend_token
      success
    }
  }
`;

/**
 * Login with email and password
 */
export const LOGIN_WITH_EMAIL_PASSWORD = gql`
  mutation loginWithEmailAndPassword(
    $passwordLoginRequestSchemaInput: PasswordLoginRequestSchemaInput
  ) {
    loginWithEmailAndPassword(
      passwordLoginRequestSchemaInput: $passwordLoginRequestSchemaInput
    ) {
      register_token
      request_id
      user {
        id
        account_type
        active
        application_id
        created_at
        dob
        first_name
        gender
        last_name
        meta
        profile_pic_url
        updated_at
        user_id
        username
        external_id
        rr_id
        emails {
          active
          email
          primary
          verified
        }
        phone_numbers {
          active
          country_code
          phone
          primary
          verified
        }
      }
    }
  }
`;

/**
 * Logout mutation
 */
export const LOGOUT = gql`
  mutation logout {
    logout {
      success
    }
  }
`;

/**
 * Get current user
 */
export const GET_CURRENT_USER = gql`
  query User {
    user {
      logged_in_user {
        id
        account_type
        active
        dob
        first_name
        gender
        last_name
        profile_pic_url
        user_id
        username
        emails {
          active
          email
          primary
          verified
        }
        phone_numbers {
          active
          country_code
          phone
          primary
          verified
        }
      }
      has_password {
        result
      }
    }
    followedListing(collectionType: "products") {
      items {
        uid
      }
      page {
        current
        next_id
        has_previous
        has_next
        item_total
        type
        size
      }
    }
  }
`;
