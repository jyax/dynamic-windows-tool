// Register the service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('background.js')
        .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
            console.error('Service Worker registration failed:', error);
        });
}

// Event listener for messages from other parts of the extension (e.g., popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle messages here if needed
    if (message.obj === null) {
        console.log(message.message);
    } else {
        console.log(message.message, message.obj);
    }

    sendResponse({ status: "Received", detail: message.message});
    return true;
});
