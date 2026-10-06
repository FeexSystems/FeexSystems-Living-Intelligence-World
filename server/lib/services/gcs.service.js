 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
















export class GCSService {
  
   __init() {this.isAvailable = false}
   __init2() {this.storageClient = null}

  constructor() {;GCSService.prototype.__init.call(this);GCSService.prototype.__init2.call(this);
    this.bucketName = process.env.GCS_EVIDENCE_BUCKET || 'feexsystems-evidence-artifacts';
    this.initClient();
  }

   async initClient() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID) {
        const { Storage } = await import('@google-cloud/storage' ).catch(() => ({ Storage: null }));
        if (Storage) {
          this.storageClient = new Storage();
          this.isAvailable = true;
        }
      }
    } catch (e) {
      this.isAvailable = false;
    }
  }

  /**
   * Upload an evidence artifact buffer or stream to Google Cloud Storage
   */
  async uploadArtifact(
    destinationPath,
    content,
    options
  ) {
    if (!this.isAvailable || !this.storageClient) {
      // Local development fallback
      return {
        url: `/uploads/${destinationPath.replace(/^\/+/, '')}`,
        success: true,
      };
    }

    try {
      const bucket = this.storageClient.bucket(this.bucketName);
      const file = bucket.file(destinationPath);

      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

      await file.save(buffer, {
        contentType: _optionalChain([options, 'optionalAccess', _ => _.contentType]) || 'application/octet-stream',
        metadata: {
          metadata: {
            uploadedBy: 'FeexSystems Evidence Fabric',
            timestamp: new Date().toISOString(),
            ...(_optionalChain([options, 'optionalAccess', _2 => _2.metadata]) || {}),
          },
        },
        resumable: false,
      });

      if (_optionalChain([options, 'optionalAccess', _3 => _3.isPublic])) {
        return {
          url: `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`,
          success: true,
        };
      }

      // Generate signed URL valid for 1 hour
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000,
      });

      return { url: signedUrl, success: true };
    } catch (error) {
      console.warn(`[GCSService] Failed to upload artifact to GCS (${destinationPath}):`, error);
      return {
        url: `/uploads/${destinationPath}`,
        success: false,
      };
    }
  }

  /**
   * Check if GCS client is connected and active
   */
  isStorageReady() {
    return this.isAvailable;
  }
}

export const gcsService = new GCSService();
