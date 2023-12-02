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

// Monitor all form of events for tab creation, deletion, and other modifications

chrome.tabs.onCreated.addListener(isSavedWindow);   //  callback => Tab object

chrome.tabs.onRemoved.addListener(isSavedWindow);   //  callback => tabId, removeInfo object [ isWindowClosing, windowId ]

// Needs to handle attachInfo object, just check if windowID is a saved window, recall saved window info and overwrite previous save
chrome.tabs.onAttached.addListener(isSavedWindow);  //  callback => tabId, attachInfo object [ newPosition, newWindowId ]

// Needs to handle detachInfo object, just check if windowID is a saved window, recall saved window info and overwrite previous save
chrome.tabs.onDetached.addListener(isSavedWindow);  //  callback => tabId, detachInfo object [ oldPosition, oldWindowId ]

// Needs to handle moveInfo object, just check if windowID is a saved window, recall saved window info and overwrite previous save
chrome.tabs.onMoved.addListener(isSavedWindow);     //  callback => tabId, moveInfo object [ fromIndex, toIndex, windowId ]

// SPECIAL LISTENER, THIS ONE IS IMPORTANT AS TAB ID'S CAN CONSTANTLY CHANGE DUE TO PRE-RENDERING, NEED TO HANDLE THIS
chrome.tabs.onReplaced.addListener(isSavedWindow)   //  callback => addedTabId, removedTabId                                                                                    NOT SURE HOW IM SUPPOSED TO SOLVE GETTING THE TAB OBJECT OR WINDOW ID YET

// Need to handle changeInfo object, just pull tab's windowID and then check if window is a saved window, recall saved window info and overwrite previous save
chrome.tabs.onUpdated.addListener(isSavedWindow);   //  callback => tabId, changeInfo object [ All Tab object info besides windowId ]                                           NOT SURE HOW IM SUPPOSED TO SOLVE GETTING THE TAB OBJECT OR WINDOW ID YET

// Provides ZoomChangeInfo object, take tabID and then grab windowID, then check if saved window, if so then overwrite previous save with new info
chrome.tabs.onZoomChange.addListener(isSavedWindow) //  callback => ZoomChangeInfo object [ newZoomFactor, oldZoomFactor, tabId, zoomSettings ]                                 NOT SURE HOW IM SUPPOSED TO SOLVE GETTING THE TAB OBJECT OR WINDOW ID YET


function isSavedWindow(windowId) {
    if (windowId === 0) {
        let variable = 0;
    }
}

function

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
    let isSavedWindow = false

    chrome.runtime.sendMessage({message: "Window ID being closed:", obj: windowId});

    // Loop through the windowsStorage array to check if the windowId exists
    for (let i = 0; i < windowsStorage.length; i++) {
        if (windowsStorage[i].windowId === windowId) {
            isSavedWindow = true;
            break;
        }
    }

    if (isSavedWindow) {
        // Show a confirm dialog to the user
        if (confirm("Do you want to save changes before closing?")) {
            // Save changes before closing
            saveStorage(function() {
                // Close the window after saving
                chrome.windows.remove(windowId, function() {
                    chrome.runtime.sendMessage({message: "Window closed after saving.", obj: null});
                });
            });
        } else {
            // Close the window without saving
            chrome.windows.remove(windowId, function() {
                chrome.runtime.sendMessage({ message:"Window closed without saving.", obj: null});
            });
        }
    }
    // // Save changes before closing
    // saveStorage(function () {
    //     // Close the window after saving
    //     chrome.windows.remove(windowId, function () {
    //         console.log("Window closed after saving.");
    //     });
    // });

})
