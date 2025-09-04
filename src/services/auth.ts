/**
 * Authentication service for user login, OTP, and session management
 */

import { GraphQLClientFactory, RequestContext } from '@/lib/apollo';
import { Config } from '@/lib/config';
import {
  LOGIN_WITH_OTP,
  VERIFY_OTP,
  RESEND_OTP_ON_MOBILE,
  LOGIN_WITH_EMAIL_PASSWORD,
  LOGOUT,
  GET_CURRENT_USER,
} from '@/graphql/queries/auth';

// Platform ID - should be in config
const PLATFORM_ID = Config.applicationId || '67a9fef03076c6a7a761763f';

/**
 * Authentication service operations
 */
export class AuthService {
  /**
   * Send OTP to mobile number for login
   */
  static async sendOTPForLogin(
    mobile: string,
    countryCode: string = '91',
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});

    try {
      console.log('Sending OTP with platform ID:', PLATFORM_ID);
      console.log('Mobile:', mobile, 'Country Code:', countryCode);
      
      const data = await GraphQLClientFactory.executeMutation(
        client,
        LOGIN_WITH_OTP,
        {
          platform: PLATFORM_ID,
          sendOtpRequestSchemaInput: {
            mobile,
            country_code: countryCode,
          },
        },
        context
      );

      console.log('OTP sent successfully DATA ####:', PLATFORM_ID, countryCode, data);

      console.log('OTP sent successfully:', data.loginWithOTP);
      return data.loginWithOTP;
    } catch (error) {
      console.error('Failed to send OTP - Full error:', error);
      
      // Check for specific GraphQL errors
      if ((error as any)?.graphQLErrors?.length > 0) {
        const graphqlError = (error as any).graphQLErrors[0];
        console.error('GraphQL Error:', graphqlError.message);
        throw new Error(graphqlError.message || 'Failed to send OTP. Please try again.');
      }
      
      // Check for network errors
      if ((error as any)?.networkError) {
        console.error('Network Error:', (error as any).networkError);
        throw new Error('Network error occurred. Please check your connection.');
      }
      
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP to complete login
   */
  static async verifyOTP(
    requestId: string,
    otp: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});

    try {
      const data = await GraphQLClientFactory.executeMutation(
        client,
        VERIFY_OTP,
        {
          platform: PLATFORM_ID,
          verifyOtpRequestSchemaInput: {
            request_id: requestId,
            otp,
          },
        },
        context
      );

      return data.verifyOTP;
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      throw new Error('Invalid OTP. Please try again.');
    }
  }

  /**
   * Resend OTP to mobile
   */
  static async resendOTP(
    mobile: string,
    countryCode: string = '91',
    token: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});

    try {
      const data = await GraphQLClientFactory.executeMutation(
        client,
        RESEND_OTP_ON_MOBILE,
        {
          platform: PLATFORM_ID,
          sendMobileOtpRequestSchemaInput: {
            mobile,
            country_code: countryCode,
            token,
            action: 'resend',
          },
        },
        context
      );

      return data.sendOTPOnMobile;
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      throw new Error('Failed to resend OTP. Please try again.');
    }
  }

  /**
   * Login with email/mobile and password
   */
  static async loginWithPassword(
    username: string,
    password: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});

    try {
      const data = await GraphQLClientFactory.executeMutation(
        client,
        LOGIN_WITH_EMAIL_PASSWORD,
        {
          passwordLoginRequestSchemaInput: {
            username,
            password,
          },
        },
        context
      );

      return data.loginWithEmailAndPassword;
    } catch (error) {
      console.error('Failed to login with password:', error);
      throw new Error('Invalid email/mobile or password. Please try again.');
    }
  }

  /**
   * Logout current user
   */
  static async logout(context?: RequestContext): Promise<boolean> {
    const client = GraphQLClientFactory.createForRequest(context || {});

    try {
      const data = await GraphQLClientFactory.executeMutation(
        client,
        LOGOUT,
        {},
        context
      );

      return data.logout?.success || false;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  }

  /**
   * Get current logged-in user
   */
  static async getCurrentUser(context?: RequestContext): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});

    try {
      const data = await GraphQLClientFactory.executeQuery(
        client,
        GET_CURRENT_USER,
        {},
        context
      );

      return data.user?.logged_in_user || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is logged in
   */
  static async isAuthenticated(context?: RequestContext): Promise<boolean> {
    const user = await this.getCurrentUser(context);
    return user !== null && user !== undefined;
  }

  /**
   * Get user profile details
   * This method returns the current user data with additional profile information
   */
  static async getUserProfile(_context: RequestContext, userId: string): Promise<any> {
    // For now, we'll use getCurrentUser as the profile data
    // In a real implementation, this would fetch more detailed profile data
    const user = await this.getCurrentUser(_context);
    
    if (user && user.id === userId) {
      return {
        ...user,
        // Add additional profile fields if needed
        orderCount: 0, // This would be fetched from orders service
        wishlistCount: 0, // This would be fetched from wishlist service
        addressCount: 0, // This would be fetched from address service
      };
    }
    
    return null;
  }

  /**
   * Update user profile
   * In a real implementation, this would call a GraphQL mutation
   */
  static async updateUserProfile(
    _context: RequestContext,
    userId: string,
    profileData: {
      name?: string;
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      gender?: string;
      birthdate?: string;
    }
  ): Promise<any> {
    // This is a placeholder implementation
    // In production, this would call the appropriate GraphQL mutation
    // const client = GraphQLClientFactory.createForRequest(context || {});
    
    try {
      // For now, return the updated data
      // In real implementation, call the update mutation
      return {
        id: userId,
        ...profileData,
        success: true,
      };
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error('Failed to update profile. Please try again.');
    }
  }
}
