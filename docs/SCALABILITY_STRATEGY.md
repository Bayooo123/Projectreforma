# Scalability Strategy: Storage & Processing

## 1. Problem Analysis
Current Architecture:
- **Storage:** Vercel Blob (Easy to use, but high cost at scale, uses Vercel's bandwidth).
- **Compute:** Vercel Serverless Functions (Next.js API Routes).
- **Processing:** Synchronous OCR (`tesseract.js`) and Parsing (`pdfjs-dist`) inside the upload request.

**Bottlenecks:**
1.  **Vercel Function Timeouts:** Serverless functions have hard timeouts (10s-60s). Large PDF processing or OCR takes minutes.
2.  **Memory Limits:** Loading large PDFs + Tesseract WASM into memory will crash 1GB/3GB function limits.
3.  **Cost:** Vercel Blob is ~$0.15/GB. Cloudflare R2 is ~$0.015/GB (10x cheaper) with zero egress fees.
4.  **User Experience:** Browser hangs while waiting for the server to process the upload.

---

## 2. Recommended Solution: "Async Pipeline"

We need to decouple **Upload**, **Storage**, and **Processing**.

### A. Storage: Switch to Cloudflare R2 (or AWS S3)
**Why:**
- **Cost:** Significantly cheaper storage class.
- **Bandwidth:** R2 has zero egress fees (downloading docs won't cost you extra).
- **Compatibility:** S3-compatible API means we can use standard AWS SDKs.

### B. Upload Pattern: Direct-to-Storage (Presigned URLs)
Instead of uploading *through* your server (`Client -> Next.js -> Storage`), clients upload *directly* to R2.

**Flow:**
1.  Client asks Next.js API: "I want to upload `contract.pdf`".
2.  Next.js checks permission & generates a securely signed "Presigned URL" from R2.
3.  Next.js sends this URL back to Client.
4.  Client uploads file **direct to R2** using that URL.
    - *Result:* Zero load on your Vercel server. Fast uploads. No timeouts.

### C. Processing Pattern: Asynchronous Background Workers
Do NOT run OCR/Text Extraction in the API route. Use a background job queue.

**Tools:**
- **Inngest** (Recommended for Vercel users): Works with Next.js Event API to trigger background functions that run for up to 2 hours.
- **Trigger.dev**: Similar alternative.

**Flow:**
1.  File lands in R2.
2.  R2 sends a webhook OR Client hits an endpoint: "File Uploaded".
3.  Inngest triggers `processDocument` function.
4.  `processDocument`:
    - Downloads file from R2.
    - Runs `tesseract.js` / parsing (on a machine with more RAM/Time).
    - Updates Database with extracted text.
    - Sends "Processing Complete" email/notification to user.

---

## 3. Implementation Plan

### Phase 1: Storage Migration (Immediate)
1.  Set up Cloudflare R2 Bucket.
2.  Replace `@vercel/blob` with `@aws-sdk/client-s3` (R2 is S3 compatible).
3.  Implement `generate-presigned-url` endpoint.
4.  Update frontend `Upload` component to use presigned flow.

### Phase 2: Async Processing (Next)
1.  Install **Inngest**.
2.  Move `src/lib/ingestion/text-extractor.ts` logic into an Inngest function.
3.  Update the upload flow to just *queue* the job, not run it.

## 4. Cost Comparison (Estimated)

| Feature | Current (Vercel Blob) | Proposed (Cloudflare R2) |
| :--- | :--- | :--- |
| **Storage (1 TB)** | $150 / month | $15 / month |
| **Egress (Download)** | ~$90 / TB | **$0 (Free)** |
| **Processing** | Failures / Timeouts | Robust / Scalable |

## 5. Next Steps
1.  **Decision:** Approve move to R2 (or AWS S3).
2.  **Access:** We need Cloudflare Account ID, Access Key, and Secret Key.
3.  **Code:** I can refactor the `Upload` component to support the Presigned URL pattern immediately.
