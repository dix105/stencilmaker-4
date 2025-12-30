document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. MOBILE MENU TOGGLE
    // ==========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.textContent = nav.classList.contains('active') ? '✕' : '☰';
        });

        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.textContent = '☰';
            });
        });
    }

    // ==========================================
    // 2. SCROLL ANIMATIONS (Intersection Observer)
    // ==========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // ==========================================
    // 3. FAQ ACCORDION
    // ==========================================
    const faqButtons = document.querySelectorAll('.faq-question');
    
    faqButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.nextElementSibling;
            const isOpen = btn.classList.contains('active');
            
            // Close all others
            document.querySelectorAll('.faq-question').forEach(b => {
                b.classList.remove('active');
                b.nextElementSibling.style.maxHeight = null;
            });

            if (!isOpen) {
                btn.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });

    // ==========================================
    // 4. MODAL LOGIC (Privacy & Terms)
    // ==========================================
    const modalTriggers = document.querySelectorAll('[data-modal-target]');
    const modalClosers = document.querySelectorAll('[data-modal-close]');

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const target = trigger.getAttribute('data-modal-target');
            openModal(target);
        });
    });

    modalClosers.forEach(closer => {
        closer.addEventListener('click', () => {
            const target = closer.getAttribute('data-modal-close');
            closeModal(target);
        });
    });

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    // ==========================================
    // 5. BACKEND INTEGRATION (Real API Calls)
    // ==========================================

    // --- CONFIGURATION ---
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    const POLL_INTERVAL = 2000; // 2 seconds
    const MAX_POLLS = 60; // Max 2 minutes of polling
    let currentUploadedUrl = null;

    // --- DOM ELEMENTS ---
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const previewImage = document.getElementById('preview-image');
    const uploadContent = document.querySelector('.upload-content'); // Contains instructions
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');
    const resultPlaceholder = document.querySelector('.result-placeholder');
    const loadingState = document.getElementById('loading-state');
    const resultContainer = document.getElementById('result-container');

    // --- CORE FUNCTIONS ---

    // Generate nanoid for unique filename
    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Upload file to CDN storage (called immediately when file is selected)
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        // Filename is just nanoid.extension (no media/ prefix unless required)
        const fileName = uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL from API
        const signedUrlResponse = await fetch(
            'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        // Domain: contents.maxstudio.ai
        const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
        return downloadUrl;
    }

    // Submit generation job (Image or Video)
    async function submitImageGenJob(imageUrl) {
        const isVideo = 'image-effects' === 'video-effects'; // Hardcoded check based on prompt
        const endpoint = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0'
        };

        let body = {};
        if (isVideo) {
            body = {
                imageUrl: [imageUrl],
                effectId: 'stencilMaker',
                userId: USER_ID,
                removeWatermark: true,
                model: 'video-effects',
                isPrivate: true
            };
        } else {
            body = {
                model: 'image-effects',
                toolType: 'image-effects',
                effectId: 'stencilMaker',
                imageUrl: imageUrl,
                userId: USER_ID,
                removeWatermark: true,
                isPrivate: true
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        return data;
    }

    // Poll job status until completed or failed
    async function pollJobStatus(jobId) {
        const isVideo = 'image-effects' === 'video-effects';
        const baseUrl = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            
            if (data.status === 'completed') {
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // --- UI HELPERS ---

    function showLoading() {
        if (loadingState) loadingState.classList.remove('hidden');
        if (loadingState) loadingState.style.display = 'flex'; // Ensure flex layout
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
        if (resultContainer) {
            // Clear previous result
            const existingMedia = document.getElementById('result-final');
            const existingVideo = document.getElementById('result-video');
            if (existingMedia) existingMedia.style.display = 'none';
            if (existingVideo) existingVideo.style.display = 'none';
        }
        if (downloadBtn) {
            downloadBtn.classList.add('disabled');
            downloadBtn.style.display = 'none';
        }
    }

    function hideLoading() {
        if (loadingState) loadingState.classList.add('hidden');
        if (loadingState) loadingState.style.display = 'none';
    }

    function updateStatus(text) {
        const statusText = document.querySelector('#loading-state p') || document.getElementById('status-text');
        if (statusText) statusText.textContent = text;
        
        if (generateBtn) {
            if (text.includes('PROCESSING') || text.includes('UPLOADING') || text.includes('SUBMITTING')) {
                generateBtn.disabled = true;
                generateBtn.textContent = text;
            } else if (text === 'READY') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Stencil';
            } else if (text === 'COMPLETE') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Again';
            }
        }
    }

    function showError(msg) {
        alert('Error: ' + msg);
        updateStatus('READY');
        hideLoading();
    }

    function showPreview(url) {
        if (previewImage) {
            previewImage.src = url;
            previewImage.classList.remove('hidden');
            previewImage.style.display = 'block';
        }
        if (uploadContent) {
            uploadContent.classList.add('hidden');
        }
    }

    function enableGenerateButton() {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('disabled');
        }
    }

    // UI Helper: Show result media (Image or Video)
    function showResultMedia(url) {
        const container = document.getElementById('result-container');
        if (!container) return;
        
        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        if (isVideo) {
            let video = document.getElementById('result-video');
            const img = document.getElementById('result-final');
            if (img) img.style.display = 'none';

            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = 'result-media';
                // Apply specific styles since Tailwind classes are removed
                video.style.width = '100%';
                video.style.height = 'auto';
                video.style.borderRadius = '0.5rem';
                video.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                container.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            let img = document.getElementById('result-final');
            const video = document.getElementById('result-video');
            if (video) video.style.display = 'none';

            if (!img) {
                img = document.createElement('img');
                img.id = 'result-final';
                img.className = 'result-media';
                // Apply specific styles since Tailwind classes are removed
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '0.5rem';
                img.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                container.appendChild(img);
            }
            // NO crossOrigin here to avoid display CORS issues
            img.src = url + '?t=' + new Date().getTime();
            img.style.display = 'block';
        }
    }

    // UI Helper: Store download URL on button
    function showDownloadButton(url) {
        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.classList.remove('disabled');
            downloadBtn.style.display = 'inline-block';
            downloadBtn.textContent = 'Download Result';
        }
    }

    // --- HANDLERS ---

    // Handler when file is selected - uploads immediately
    async function handleFileSelect(file) {
        try {
            // Reset previous results
            const existingResult = document.getElementById('result-final');
            if (existingResult) existingResult.style.display = 'none';
            if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
            if (downloadBtn) {
                downloadBtn.style.display = 'none';
                downloadBtn.classList.add('disabled');
            }

            // Visual feedback
            if (uploadContent) uploadContent.classList.add('hidden');
            if (previewImage) {
                // Show local preview temporarily or wait for upload? 
                // Prompt says "Show the uploaded image preview".
                // But for better UX, we can show text "Uploading..."
            }
            
            updateStatus('UPLOADING...');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Uploading...';
            }

            // Upload immediately
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Show the uploaded image preview
            showPreview(uploadedUrl);
            
            updateStatus('READY');
            enableGenerateButton();
            
        } catch (error) {
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // Handler when Generate button is clicked
    async function handleGenerate() {
        if (!currentUploadedUrl) {
            alert('Please upload an image first.');
            return;
        }
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // Step 1: Submit job
            const jobData = await submitImageGenJob(currentUploadedUrl);
            
            updateStatus('JOB QUEUED...');
            
            // Step 2: Poll for completion
            const result = await pollJobStatus(jobData.jobId);
            
            // Step 3: Get result URL
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                console.error('Response:', result);
                throw new Error('No media URL in response');
            }
            
            // Step 4: Display result
            showResultMedia(resultUrl);
            
            updateStatus('COMPLETE');
            hideLoading();
            showDownloadButton(resultUrl);
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // --- WIRING EVENT LISTENERS ---

    // File Input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    // Upload Zone Drag & Drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
            uploadZone.style.borderColor = 'var(--primary)';
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            uploadZone.style.borderColor = '';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            uploadZone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        });
        
        // Click to upload
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    // Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentUploadedUrl = null;
            if (fileInput) fileInput.value = '';
            if (previewImage) {
                previewImage.src = '';
                previewImage.classList.add('hidden');
                previewImage.style.display = 'none';
            }
            if (uploadContent) uploadContent.classList.remove('hidden');
            
            // Clear results
            const existingResult = document.getElementById('result-final');
            const existingVideo = document.getElementById('result-video');
            if (existingResult) existingResult.remove();
            if (existingVideo) existingVideo.remove();
            
            if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
            if (downloadBtn) {
                downloadBtn.style.display = 'none';
                downloadBtn.classList.add('disabled');
            }
            
            updateStatus('READY');
            if (generateBtn) {
                generateBtn.textContent = 'Generate Stencil';
                generateBtn.disabled = false;
            }
        });
    }

    // DOWNLOAD BUTTON - Robust Strategy
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.classList.add('disabled');
            
            // Helper to trigger download from blob
            function downloadBlob(blob, filename) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
            
            // Helper to get extension
            function getExtension(url, contentType) {
                if (contentType) {
                    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
                    if (contentType.includes('png')) return 'png';
                    if (contentType.includes('mp4')) return 'mp4';
                }
                const match = url.match(/\.(jpe?g|png|webp|mp4|webm)/i);
                return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
            }
            
            try {
                // STRATEGY 1: Proxy
                const proxyUrl = 'https://api.chromastudio.ai/download-proxy?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy failed');
                
                const blob = await response.blob();
                const ext = getExtension(url, response.headers.get('content-type'));
                downloadBlob(blob, 'stencil_' + generateNanoId(8) + '.' + ext);
                
            } catch (proxyErr) {
                console.warn('Proxy download failed, trying direct fetch');
                
                // STRATEGY 2: Direct Fetch
                try {
                    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                    const response = await fetch(fetchUrl, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        const ext = getExtension(url, response.headers.get('content-type'));
                        downloadBlob(blob, 'stencil_' + generateNanoId(8) + '.' + ext);
                        return;
                    }
                    throw new Error('Direct fetch failed');
                } catch (fetchErr) {
                    console.warn('Direct fetch failed, trying canvas/link');
                    
                    // STRATEGY 3: Canvas (Images only)
                    const img = document.getElementById('result-final');
                    if (img && img.complete && img.naturalWidth > 0) {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            
                            // Try to redraw image to canvas
                            // Note: This will likely taint canvas if CORS headers are missing on image load
                            // But we try nonetheless via a new CORS-enabled image object
                            
                            const tempImg = new Image();
                            tempImg.crossOrigin = 'anonymous';
                            tempImg.onload = function() {
                                ctx.drawImage(tempImg, 0, 0);
                                canvas.toBlob((blob) => {
                                    if (blob) downloadBlob(blob, 'stencil_' + generateNanoId(8) + '.png');
                                    else forceLink();
                                }, 'image/png');
                            };
                            tempImg.onerror = forceLink;
                            tempImg.src = url + '?crossorigin=' + Date.now();
                            return;
                        } catch (e) { forceLink(); }
                    } else {
                        forceLink();
                    }
                    
                    // STRATEGY 4: Force Link
                    function forceLink() {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'stencil_' + generateNanoId(8) + '.png';
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        alert('If download did not start, please right-click the image and "Save Image As".');
                    }
                }
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.classList.remove('disabled');
            }
        });
    }
});