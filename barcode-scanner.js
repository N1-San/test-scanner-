console.log("📦 barcode-scanner.js LOADED");

class BarcodeScanner {
    constructor() {
        this.modal = document.getElementById("barcode-scanner-modal");
        this.containerId = "scanner-container";
        this.qrcodeScanner = null;
        this.activeTargetInput = null;

        console.log("🚀 Initializing BarcodeScanner");

        this.bindScannerButtons();
        this.bindStopButton();
    }

    isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    isFlutterWebView() {
        return navigator.userAgent.includes("wv") || window.FlutterWebViewPlatform !== undefined;
    }

    showModal() {
        if (this.modal) {
            this.modal.style.display = "block";

            // Fullscreen adjustments for Android & Flutter WebView
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes("android") || this.isFlutterWebView()) {
                const content = this.modal.querySelector(".scanner-modal-content");
                if (content) {
                    content.style.width = "100%";
                    content.style.height = "100%";
                    content.style.maxWidth = "none";
                    content.style.maxHeight = "none";
                    content.style.borderRadius = "0";
                    content.style.padding = "0";
                }
                const container = document.getElementById(this.containerId);
                if (container) {
                    container.style.width = "100%";
                    container.style.height = (window.innerHeight - 60) + "px"; // leave space for stop button
                }
            }
        }
    }

    hideModal() {
        if (this.modal) {
            this.modal.style.display = "none";
        }
    }

    injectScannerStyles() {
        const style = document.createElement("style");
        style.innerHTML = `
            #${this.containerId} {
                height: ${this.isAndroid() || this.isFlutterWebView() ? "100vh" : "400px"} !important;
                width: 100% !important;
                position: relative !important;
            }
            #${this.containerId} video {
                z-index: auto !important;
                position: relative !important;
                object-fit: cover !important;
                width: 100% !important;
                height: 100% !important;
            }
            #${this.containerId} canvas {
                z-index: auto !important;
                position: absolute !important;
            }
            #${this.containerId} .qr-shaded-region,
            #${this.containerId} #qr-shaded-region {
                z-index: auto !important;
                position: absolute !important;
                pointer-events: none;
                display: block !important;
            }

            /* 🔥 Force Stop button above video */
            #stop-scanner {
                position: absolute !important;
                bottom: 20px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 99999 !important;
                background: red;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);
        console.log("🎨 Injected scanner overlay + stop button styles");
    }


    async startScan(onScan) {
        console.log("📡 Starting scan...");
        this.showModal();

        if (!this.qrcodeScanner) {
            this.qrcodeScanner = new Html5Qrcode(this.containerId);
        }

        try {
            const devices = await Html5Qrcode.getCameras();
            console.log("📷 Available devices:", devices);

            let backCamera = devices.find(d =>
                d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("rear")
            );
            const cameraId = backCamera ? backCamera.id : devices[0]?.id;

            if (!cameraId) throw new Error("No camera found");

            console.log(`🎯 Using camera: ${backCamera ? "Back" : "Default"}`, cameraId);

            await this.qrcodeScanner.start(
                { deviceId: { exact: cameraId } },
                {
                    fps: 10,
                    qrbox: this.isAndroid() || this.isFlutterWebView()
                        ? { width: window.innerWidth * 0.8, height: 150 }
                        : { width: 300, height: 100 },
                    formatsToSupport: ["CODE_128", "EAN_13", "UPC_A"],
                },
                (decodedText) => {
                    console.log("✅ Scanned code:", decodedText);
                    onScan(decodedText);
                    this.stop();
                },
                (errorMessage) => {
                    console.warn("⚠️ Scanning error:", errorMessage);
                }
            );

            this.injectScannerStyles();

        } catch (err) {
            console.warn("⚠️ Device selection failed, falling back to facingMode", err);

            try {
                await this.qrcodeScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: this.isAndroid() || this.isFlutterWebView()
                            ? { width: window.innerWidth * 0.8, height: 150 }
                            : { width: 300, height: 100 },
                        formatsToSupport: ["CODE_128", "EAN_13", "UPC_A"],
                    },
                    (decodedText) => {
                        console.log("✅ Scanned code:", decodedText);
                        onScan(decodedText);
                        this.stop();
                    },
                    (errorMessage) => {
                        console.warn("⚠️ Scanning error:", errorMessage);
                    }
                );
                this.injectScannerStyles();
            } catch (finalErr) {
                console.error("❌ Camera start failed completely:", finalErr);
                this.hideModal();
            }
        }
    }

    stop() {
        if (this.qrcodeScanner) {
            this.qrcodeScanner
                .stop()
                .then(() => {
                    this.qrcodeScanner.clear();
                    this.hideModal();
                })
                .catch((err) => {
                    console.error("❌ Scanner stop failed:", err);
                });
        }
    }

    bindScannerButtons() {
        console.log("🧲 Binding scanner buttons...");
        const buttons = document.querySelectorAll(".scanner-init");
        console.log(`🔍 Found ${buttons.length} scanner buttons`);

        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                const targetSelector = button.dataset.target;
                const targetInput = targetSelector ? document.querySelector(targetSelector) : null;

                if (!targetInput) {
                    console.warn(`⚠️ Could not find target input using selector: ${targetSelector}`);
                }

                this.startScan((scannedCode) => {
                    if (targetInput) {
                        targetInput.value = scannedCode;
                        targetInput.focus();
                    } else {
                        alert("Scanned: " + scannedCode);
                    }
                });
            });
        });
    }

    bindStopButton() {
        document.addEventListener("DOMContentLoaded", () => {
            const stopBtn = document.getElementById("stop-scanner");
            if (stopBtn) {
                stopBtn.addEventListener("click", () => this.stop());
            }
        });
    }
}

window.BarcodeScannerModal = new BarcodeScanner();
