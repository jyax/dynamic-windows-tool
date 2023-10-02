// Call the updateWindowListUI function when the popup is loaded
document.addEventListener("DOMContentLoaded", updateWindowListUI);
const windowList = document.getElementById("window-list");
const saveButton = document.getElementById("save-window");

// Load saved windows from storage and display them
function loadSavedWindows() {
    const windowsData = localStorage.getItem("windows");

    if (windowsData) {
        const windows = JSON.parse(windowsData);
        console.log("Loaded saved windows:", windows); // Log loaded windows
        windows.forEach((window) => {
            const button = createWindowButton(window);
            windowList.appendChild(button);
        });
    }
}

// Function to save a window to storage
function saveWindow(savedWindow) {
    const windowsData = localStorage.getItem("windows");
    let windows = [];

    if (windowsData) {
        windows = JSON.parse(windowsData);
    }

    const existingIndex = windows.findIndex((win) => win.windowId === savedWindow.windowId);

    if (existingIndex !== -1 && windows[existingIndex].windowId !== chrome.windows.WINDOW_ID_CURRENT) {
        windows[existingIndex] = savedWindow;
    } else if (existingIndex === -1) {
        // Only save the window if it doesn't match the saved window being opened
        windows.push(savedWindow);
    }

    localStorage.setItem("windows", JSON.stringify(windows));
    console.log("Saved window:", savedWindow); // Log saved window

    // Now, update the displayed list of saved windows in the popup
    updateWindowListUI();
}

// Save the current window when the "Save" button is clicked
saveButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const windowName = prompt("Enter a name for the window:");

        if (windowName) {
            const savedWindow = { name: windowName, tabs: tabs, windowId: chrome.windows.WINDOW_ID_CURRENT };
            console.log("Saving window:", savedWindow); // Log saved window
            saveWindow(savedWindow);
        }
    });
});

// Function to create a button for a saved window
function createWindowButton(savedWindow) {
    const container = document.createElement("div");

    // Create a button container for the saved window
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container");

    // Create a nested button container to hold both buttons and fit dynamically
    const nestedButtonContainer = document.createElement("div");
    nestedButtonContainer.classList.add("nested-button-container");

    // Create a button for the saved window
    const button = document.createElement("button");
    button.textContent = savedWindow.name;

    // Create a "Delete" button with an "X" icon
    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-button");

    // Create an icon element for the "X" icon
    const icon = document.createElement("i");
    icon.classList.add("fas", "fa-times"); // Add Font Awesome classes for the "X" icon

    // Add the icon to the delete button
    deleteButton.appendChild(icon);

    // Add a click event listener that will delete and refresh the popup
    deleteButton.addEventListener("click", () => {
        deleteSavedWindow(savedWindow);
    });

    // Add a click event listener that will open the window
    button.addEventListener("click", () => {
        openSavedWindow(savedWindow);
    });

    // Append the button and "Delete" button to the button container
    nestedButtonContainer.appendChild(button);
    nestedButtonContainer.appendChild(deleteButton);

    // Append the nested container to the original container
    buttonContainer.appendChild(nestedButtonContainer);

    // Append the button container to the main container
    container.appendChild(buttonContainer);

    return container;
}


/// CURRENTLY DOES NOT WORK PROPERLY --- NEEDS TO BE UPDATED TO CURRENT HYBRID STORAGE INFORMATION
/// NEED TO TAKE INTO ACCOUNT THAT WINDOW ID SHOULD NOT CHECKED AGAINST OLD CLOSED WINDOWS
/// ONLY WHEN CHECKING IF ALREADY OPEN
function openSavedWindow(savedWindow) {
    const windowIdToOpen = savedWindow.windowId;

    if (windowIdToOpen !== chrome.windows.WINDOW_ID_NONE) {
        // If the window ID is valid, simply focus it
        console.log("Focusing window:", windowIdToOpen); // Log focusing window
        chrome.windows.update(windowIdToOpen, { focused: true });
    } else {
        // If the window does not exist, create a new window with the saved tabs
        chrome.windows.create({ url: savedWindow.tabs.map((tab) => tab.url), focused: true }, (newWindow) => {
            // Update the saved window object with the new window ID
            savedWindow.windowId = newWindow.id;
            console.log("Opened and saved window:", savedWindow); // Log opened and saved window
            saveWindow(savedWindow);
        });
    }
}

// Function to delete a button for a saved window
function deleteSavedWindow(savedWindow) {
    // Retrieve the list of saved windows from storage
    const windowsData = localStorage.getItem("windows");

    if (windowsData) {
        const windows = JSON.parse(windowsData);

        // Find the index of the window to delete
        const windowIndex = windows.findIndex((win) => win.windowId === savedWindow.windowId);

        if (windowIndex !== -1) {
            // Remove the window from the saved windows list
            windows.splice(windowIndex, 1);
            console.log("Deleted window:", savedWindow); // Log deleted window

            // Update the storage with the modified list
            localStorage.setItem("windows", JSON.stringify(windows));

            // Update the displayed list of saved windows in the popup
            updateWindowListUI();
        }
    }
}

// Function to update the displayed list of saved windows in the popup
function updateWindowListUI() {
    const windowList = document.getElementById("window-list");

    // Clear the existing list of saved windows
    windowList.innerHTML = "";

    // Load saved windows from storage and display them
    loadSavedWindows();
}

// Monitor tab creation to update saved windows
chrome.tabs.onCreated.addListener(handleTabCreated);

function handleTabCreated(tab) {
    // Retrieve the list of saved windows from storage
    const windowsData = localStorage.getItem("windows");

    if (windowsData) {
        const windows = JSON.parse(windowsData);

        // Find the index of the window to update
        const windowIndex = windows.findIndex((win) => win.windowId === tab.windowId);

        if (windowIndex !== -1) {
            // Update the window's tabs list
            windows[windowIndex].tabs.push({ id: tab.id, windowId: tab.windowId, url: tab.url });
            console.log("Updated window:", windows[windowIndex]); // Log updated window

            // Update the storage with the modified list
            localStorage.setItem("windows", JSON.stringify(windows));

            // Update the displayed list of saved windows in the popup
            updateWindowListUI();
        }
    }
}

// Monitor tab removal to update saved windows
chrome.tabs.onRemoved.addListener(handleTabRemoved);

function handleTabRemoved(tabId, removeInfo) {
    // Retrieve the list of saved windows from storage
    const windowsData = localStorage.getItem("windows");

    if (windowsData) {
        const windows = JSON.parse(windowsData);

        // Find the index of the window to update
        const windowIndex = windows.findIndex((win) => win.windowId === removeInfo.windowId);

        if (windowIndex !== -1) {
            // Check if the tab being removed is in the saved window's tabs list
            const tabIndex = windows[windowIndex].tabs.findIndex((tab) => tab.id === tabId);

            if (tabIndex !== -1) {
                // Remove the tab from the saved window's tabs list
                windows[windowIndex].tabs.splice(tabIndex, 1);
                console.log("Updated window:", windows[windowIndex]); // Log updated window

                // Update the storage with the modified list
                localStorage.setItem("windows", JSON.stringify(windows));

                // Update the displayed list of saved windows in the popup
                updateWindowListUI();
            }
        }
    }
}

