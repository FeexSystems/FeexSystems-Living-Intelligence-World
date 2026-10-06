import sharp from 'sharp';
import { mkdir, } from 'fs/promises';
import { dirname } from 'path';
import { logger } from '../logging';








export class ImageService {
  /**
   * Process and optimize an image
   */
  async optimizeImage(
    input,
    output,
    options = {}
  ) {
    try {
      const {
        width,
        height,
        quality = 80,
        format = 'webp'
      } = options;

      // Create output directory if it doesn't exist
      await mkdir(dirname(output), { recursive: true });

      // Process image with sharp
      let pipeline = sharp(input);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to desired format and optimize
      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality });
          break;
      }

      // Save optimized image
      await pipeline.toFile(output);

      return output;
    } catch (error) {
      logger.error('Image optimization failed:', error);
      throw new Error('Failed to optimize image');
    }
  }

  /**
   * Generate responsive image sizes
   */
  async generateResponsiveImages(
    input,
    outputPattern,
    sizes = [320, 640, 768, 1024, 1280]
  ) {
    try {
      const outputs = [];

      // Generate images for each size
      for (const width of sizes) {
        const output = outputPattern.replace('[width]', width.toString());
        await this.optimizeImage(input, output, { width });
        outputs.push(output);
      }

      return outputs;
    } catch (error) {
      logger.error('Responsive image generation failed:', error);
      throw new Error('Failed to generate responsive images');
    }
  }

  /**
   * Generate image placeholder
   */
  async generatePlaceholder(input) {
    try {
      const placeholder = await sharp(input)
        .resize(20) // Tiny size
        .blur() // Add blur effect
        .toBuffer();

      return `data:image/jpeg;base64,${placeholder.toString('base64')}`;
    } catch (error) {
      logger.error('Placeholder generation failed:', error);
      throw new Error('Failed to generate image placeholder');
    }
  }
}

// Export singleton instance
export const imageService = new ImageService();
