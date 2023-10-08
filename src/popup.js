// Call the updateWindowListUI function when the popup is loaded
document.addEventListener("DOMContentLoaded", updateWindowListUI);
let windowList = document.getElementById("window-list");
const saveButton = document.getElementById("save-window");
let windowsStorage = [];

function loadStorage() {
    chrome.runtime.sendMessage({message:"Loading from Local Storage", obj: null});
    windowsStorage = JSON.parse(localStorage.getItem("windows"))
}

function saveStorage() {
    chrome.runtime.sendMessage({message:"Saving to Local Storage", obj: null});
    localStorage.setItem("windows", JSON.stringify(windowsStorage));
}

// Save the current window when the "Save" button is clicked
saveButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const windowName = prompt("Enter a name for the window:");

        if (windowName) {
            const savedWindow = { name: windowName, tabs: tabs, windowId: tabs[0].windowId };
            chrome.runtime.sendMessage({message: "Saving window:", obj: savedWindow}); // Log saved window
            saveWindow(savedWindow);
        }
    });
});

// Function to update the displayed list of saved windows in the popup
function updateWindowListUI() {

    // Clear the existing list of saved windows
    windowList.innerHTML = "";

    // Load saved windows from storage and display them
    loadSavedWindows();
}

// Load saved windows from storage and display them
function loadSavedWindows() {
    loadStorage();
    chrome.runtime.sendMessage({message: "Loaded saved windows:", obj: windowsStorage}); // Log loaded windows
    windowsStorage.forEach((window) => {
        const button = createWindowButton(window);
        windowList.appendChild(button);
    });
}

// Function to save a window to storage
function saveWindow(savedWindow) {
    // This checks if in the localStorage the current window is already saved based on the windowId
    const existingIndex = windowsStorage.findIndex((win) => win.windowId === savedWindow.windowId);


    if (existingIndex !== -1) {
        windowsStorage[existingIndex] = savedWindow;
    } else if (existingIndex === -1) {
        // Only save the window if it doesn't match the saved window being opened
        windowsStorage.push(savedWindow);
    }

    saveStorage();
    chrome.runtime.sendMessage({message: "Saved window:", obj: savedWindow}); // Log saved window

    // Now, update the displayed list of saved windows in the popup
    updateWindowListUI();
}



// Function to create a button for a saved window
function createWindowButton(savedWindow) {
    const container = document.createElement("div");

    // Create a button container for the saved window
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container");

    // Create a button for the saved window
    const button = document.createElement("button");
    button.textContent = savedWindow.name.charAt(0).toUpperCase() + savedWindow.name.slice(1);
    button.classList.add("window-button");

    // Create a "Delete" button with an "X" icon
    const deleteButton = document.createElement("button");
    deleteButton.setAttribute('id', 'delete-button');

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
    buttonContainer.appendChild(deleteButton);
    buttonContainer.appendChild(button);

    // Append the button container to the main container
    container.appendChild(buttonContainer);

    return container;
}


/// CURRENTLY DOES NOT WORK PROPERLY --- NEEDS TO BE UPDATED TO CURRENT HYBRID STORAGE INFORMATION
/// NEED TO TAKE INTO ACCOUNT THAT WINDOW ID SHOULD NOT CHECKED AGAINST OLD CLOSED WINDOWS
/// ONLY WHEN CHECKING IF ALREADY OPEN
function openSavedWindow(savedWindow) {
    loadStorage();

    const windowIdToOpen = savedWindow.windowId;
    chrome.runtime.sendMessage({message: "window to open:", obj:windowIdToOpen});
    let openWindow = false;

    chrome.windows.getAll({ populate: false }, (windows) => {
        for (const window of windows) {
            const windowId = window.id;
            chrome.runtime.sendMessage({message: "current window.id to check", obj: windowId});
            if (windowIdToOpen === windowId) {
                openWindow = true;
                chrome.runtime.sendMessage({message: "window id found in windows!:", obj: openWindow});
            }
        }

        if (!openWindow) {
            // If the window does not exist, create a new window with the saved tabs
            const tabUrls = savedWindow.tabs.map((tab) => tab.url);
            chrome.windows.create({ url: tabUrls, focused: true }, (newWindow) => {
                // Update the saved window object with the new window ID
                let newSave = {name: savedWindow.name, tabs: savedWindow.tabs, windowId: newWindow.id};
                windowsStorage[windowsStorage.findIndex(saveWindow)] = newSave;
                chrome.runtime.sendMessage({message: "Opened and saved window:",
                    obj: newSave
                });
                saveStorage();
            });
        }
        else {
            // If the window is already open, you might want to focus on it or handle it differently.
            // You can add code here to focus on the existing window or handle this scenario.
            chrome.runtime.sendMessage({ message: "Window is already open", obj: null});

            // If the window ID is valid, simply focus it
            chrome.runtime.sendMessage({message: "Focusing window:", obj: windowIdToOpen}); // Log focusing window
            chrome.windows.update(windowIdToOpen, { focused: true });
        }
    });
}

// Function to delete a button for a saved window
function deleteSavedWindow(savedWindow) {
    loadStorage();
    // Find the index of the window to delete
    const windowIndex = windowsStorage.findIndex((win) => win.windowId === savedWindow.windowId);

    if (windowIndex !== -1) {
        // Remove the window from the saved windows list
        windowsStorage.splice(windowIndex, 1);
        chrome.runtime.sendMessage({message: "Deleted window:", obj: savedWindow}); // Log deleted window

        saveStorage();

        // Update the displayed list of saved windows in the popup
        updateWindowListUI();
    }
}

// Monitor tab creation to update saved windows
chrome.tabs.onCreated.addListener(handleTabCreated);

function handleTabCreated(tab) {
    loadStorage();
    chrome.runtime.sendMessage({message: "Tab Created:", obj: tab.windowId})
    // Find the index of the window to update
    const windowIndex = windowsStorage.findIndex((win) => win.windowId === tab.windowId);
    chrome.runtime.sendMessage({message: "Current window index for new tab:", obj: windowIndex});
    if (windowIndex !== -1) {
        // Update the window's tabs list
        windowsStorage[windowIndex].tabs.push({ id: tab.id, windowId: tab.windowId, url: tab.url });
        chrome.runtime.sendMessage({message: "Updated window:", obj: windowsStorage[windowIndex]}); // Log updated window

        saveStorage();

        // Update the displayed list of saved windows in the popup
        updateWindowListUI();
    }

}

// Monitor tab removal to update saved windows
chrome.tabs.onRemoved.addListener(handleTabRemoved);

function handleTabRemoved(tabId, removeInfo) {
    loadStorage();

    // Find the index of the window to update
    const windowIndex = windowsStorage.findIndex((win) => win.windowId === removeInfo.windowId);

    if (windowIndex !== -1) {
        // Check if the tab being removed is in the saved window's tabs list
        const tabIndex = windowsStorage[windowIndex].tabs.findIndex((tab) => tab.id === tabId);

        if (tabIndex !== -1) {
            // Remove the tab from the saved window's tabs list
            windowsStorage[windowIndex].tabs.splice(tabIndex, 1);
            chrome.runtime.sendMessage({message: "Updated window:", obj: windowsStorage[windowIndex]}); // Log updated window

            saveStorage();

            // Update the displayed list of saved windows in the popup
            updateWindowListUI();
        }
    }
}

chrome.windows.onRemoved.addListener( function(windowId) {
    // Save changes before closing
    saveStorage(function () {
        // Close the window after saving
        chrome.windows.remove(windowId, function () {
            console.log("Window closed after saving.");
        });
    });

    // // Show a confirm dialog to the user
    // if (confirm("Do you want to save changes before closing?")) {
    //     // Save changes before closing
    //     saveStorage(function() {
    //         // Close the window after saving
    //         chrome.windows.remove(windowId, function() {
    //             console.log("Window closed after saving.");
    //         });
    //     });
    // } else {
    //     // Close the window without saving
    //     chrome.windows.remove(windowId, function() {
    //         console.log("Window closed without saving.");
    //     });
    // }
})
