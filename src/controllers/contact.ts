import { Request, Response } from 'express';
import { ContentService } from '@/services/content';
import { asyncHandler } from '@/middlewares/error';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';

interface ContactPageData {
  navigation: any;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
  };
  contact: {
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      pincode: string;
    };
    businessHours: {
      weekdays: string;
      saturday: string;
      sunday: string;
    };
    socialMedia: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
    };
  };
  breadcrumbs: Array<{
    name: string;
    url: string;
  }>;
  req: any;
}

/**
 * Contact page controller
 * Handles the contact page with store information and contact form
 */
export const contactController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info({ path: req.path }, 'Fetching contact page data');

      // Fetch navigation data
      const navigation = await ContentService.Navigation.getNavigation(context);

      // Prepare contact information (in a real app, this might come from a CMS or database)
      const contact = {
        email: 'support@fyndstore.com',
        phone: '+91 1800-123-4567',
        address: {
          line1: 'Fynd Store Headquarters',
          line2: 'Tech Park, Building A',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pincode: '400001'
        },
        businessHours: {
          weekdays: '9:00 AM - 7:00 PM',
          saturday: '10:00 AM - 6:00 PM',
          sunday: 'Closed'
        },
        socialMedia: {
          facebook: 'https://facebook.com/fyndstore',
          twitter: 'https://twitter.com/fyndstore',
          instagram: 'https://instagram.com/fyndstore',
          linkedin: 'https://linkedin.com/company/fyndstore',
          youtube: 'https://youtube.com/fyndstore'
        }
      };

      // Prepare breadcrumbs
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Contact Us', url: '/contact' }
      ];

      // Prepare SEO data
      const seo = {
        title: 'Contact Us - Fynd Store',
        description: 'Get in touch with Fynd Store. Find our contact information, business hours, and location. We\'re here to help with your shopping needs.',
        keywords: 'contact, fynd store, customer service, support, help',
        ogTitle: 'Contact Fynd Store',
        ogDescription: 'Reach out to us for any queries or feedback. We\'re here to help!',
        canonicalUrl: `${req.protocol}://${req.get('host')}/contact`
      };

      // Prepare template data
      const templateData: ContactPageData = {
        navigation,
        seo,
        contact,
        breadcrumbs,
        req: {
          ...req,
          path: req.path || '/contact'
        }
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 3600, // 1 hour for static contact page
        public: true,
      });

      // Render the contact page
      res.render('pages/contact', templateData);

      logger.info('Contact page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render contact page');
      throw error;
    }
  }
);

/**
 * Contact form submission handler
 * Processes contact form submissions (POST request)
 */
export const contactFormController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);

    try {
      const { name, email, phone, subject } = req.body;

      logger.info({ 
        name, 
        email, 
        phone, 
        subject 
      }, 'Contact form submission received');

      // In a real application, you would:
      // 1. Validate the form data
      // 2. Send an email notification
      // 3. Store in database
      // 4. Send confirmation email to user

      // For now, we'll just return a success response
      res.json({
        success: true,
        message: 'Thank you for contacting us. We will get back to you soon!',
        data: {
          referenceId: `CONTACT-${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Contact form processed successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to process contact form');
      res.status(500).json({
        success: false,
        message: 'Failed to process your request. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);
