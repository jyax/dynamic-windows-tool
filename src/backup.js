document.AddEventListener( "DOMContentLoaded", updateWindowListUI);

const windowList = document.getElementById("window-list");
const saveButton = document.getElementById("save-window");











// tabs.pendingUrl or tabs.url could be useful for querying the information to the local storage during the listener for window being closed.
function saveWindow(savedWindow) {
    const windowsData = localStorage.getItem("windows");
    let windows = [];

    if (windowsData) {
        windows = JSON.parse(windowsData);
    }

    const existingIndex = windows.findIndex((win) => win.WindowId === savedWindow.windowId);

    if (existingIndex !== -1 && windows[existingIndex].windowId !== chrome.windows.WINDOW_ID_CURRENT) {
        windows[existingIndex] = savedWindow;
    } else if (existingIndex === -1) {
        windows.push(savedWindow);
    }
}


// Save the current window when the "Save" button is clicked

/**
 * Process:
 * query the tabs from the window.
 */
saveButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const windowName = prompt("Enter a name for the window:");

        if (windowName) {
            const savedWindow = { name: windowName, tabs: tabs, windowId: chrome.windows.WINDOW_ID_CURRENT };
            console.log("Saving window:", savedWindow); // Logs saved window
            saveWindow(savedWindow);
        }
    })
})