console.log("📦 barcode-scanner.js LOADED");

class BarcodeScanner {
    constructor() {
        this.modal = document.getElementById("barcode-scanner-modal");
        this.containerId = "scanner-container";
        this.qrcodeScanner = null;
        this.activeTargetInput = null;

        console.log("🚀 Initializing BarcodeScanner");

        this.bindScannerButtons(); // Initial scan button binding
        this.bindStopButton();     // Stop button in modal
    }

    showModal() {
        if (this.modal) this.modal.style.display = "block";
    }

    hideModal() {
        if (this.modal) this.modal.style.display = "none";
    }

    injectScannerStyles() {
        const style = document.createElement("style");
        style.innerHTML = `
            #scanner-container {
                height: 400px !important;
                position: relative !important;
            }
            #scanner-container video {
                z-index: 100001 !important;
                position: relative !important;
            }
            #scanner-container canvas {
                z-index: 100002 !important;
                position: absolute !important;
            }
            #scanner-container .qr-shaded-region,
            #scanner-container #qr-shaded-region {
                z-index: 100003 !important;
                position: absolute !important;
                pointer-events: none;
                display: block !important;
            }
        `;
        document.head.appendChild(style);
        console.log("🎨 Injected scanner overlay styles");
    }

    isFlutterWebView() {
        return navigator.userAgent.includes("wv") || window.FlutterWebViewPlatform !== undefined;
    }

    startScan(onScan) {
        console.log("📡 Starting scan...");
        this.showModal();

        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.height = "400px";
            container.style.position = "relative";
        }

        if (!this.qrcodeScanner) {
            this.qrcodeScanner = new Html5Qrcode(this.containerId);
        }

        if (this.isFlutterWebView()) {
            console.log("📱 Detected Flutter WebView, forcing environment camera");
            this.qrcodeScanner.start(
                { facingMode: { exact: "environment" } },
                {
                    fps: 10,
                    qrbox: { width: 300, height: 100 },
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
            ).then(() => {
                this.injectScannerStyles();
            }).catch((err) => {
                console.error("❌ Environment camera failed, falling back to default:", err);
                this.qrcodeScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 300, height: 100 },
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
                ).then(() => {
                    this.injectScannerStyles();
                }).catch((err) => {
                    console.error("❌ Camera start failed completely:", err);
                    this.hideModal();
                });
            });

        } else {
            Html5Qrcode.getCameras()
                .then((devices) => {
                    if (!devices || devices.length === 0) {
                        console.warn("⚠️ No camera devices found");
                        return;
                    }

                    let backCamera = devices.find(device =>
                        device.label.toLowerCase().includes('back') ||
                        device.label.toLowerCase().includes('rear')
                    );
                    const cameraId = backCamera ? backCamera.id : devices[0].id;

                    this.qrcodeScanner
                        .start(
                            { deviceId: { exact: cameraId } },
                            {
                                fps: 10,
                                qrbox: { width: 300, height: 100 },
                                formatsToSupport: ["CODE_128", "EAN_13", "UPC_A"],
                            },
                            (decodedText) => {
                                console.log("✅ Scanned code:", decodedText);
                                onScan(decodedText);
                                this.stop();
                            },
                            (errorMessage) => {
                                console.warn("⚠️ Scanning error:", errorMessage);
                            },
                            300
                        )
                        .then(() => {
                            this.injectScannerStyles();
                            setTimeout(() => {
                                const shaded = document.getElementById("qr-shaded-region");
                                console.log("📦 qr-shaded-region element:", shaded);
                                console.log("📦 display style:", shaded?.style?.display);
                            }, 1000);
                        })
                        .catch((err) => {
                            console.error("❌ Failed to start camera:", err);
                            this.hideModal();
                        });
                })
                .catch((err) => {
                    console.error("❌ Camera detection failed:", err);
                    this.hideModal();
                });
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
