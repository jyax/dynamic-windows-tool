// Call the updateWindowListUI function when the popup is loaded
document.addEventListener("DOMContentLoaded", updateWindowListUI);
let windowList = document.getElementById("window-list");
const saveButton = document.getElementById("save-window");
let windowsStorage = [];

function loadStorage() {
    try {
        const storedData = localStorage.getItem('windows');
        windowsStorage = storedData ? JSON.parse(storedData) : [];
    } catch (err) {
        console.log('Error parsing windows from localStorage: ', err);
        windowsStorage = [];
    }
    logEvent({message:"Loading from Local Storage", obj: windowsStorage})
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message: ', err);
        });
}

function saveStorage() {
    localStorage.setItem('windows', JSON.stringify(windowsStorage));
    logEvent({message:"Saving to Local Storage", obj: windowsStorage})
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message: ', err);
        });
}

// Save the current window when the "Save" button is clicked
saveButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const windowName = prompt("Enter a name for the window:");

        if (windowName) {
            const savedWindow = { name: windowName, tabs: tabs, windowId: tabs[0].windowId };
            logEvent({message: "Saving window:", obj: savedWindow}) // Log Saved Window
                .then(r => {
                    console.log('Message successfully sent', r);
                })
                .catch(err => {
                    console.error('Error occurred while sending message: ', err);
                });
            saveWindow(savedWindow);
        }
    });
});

function logEvent(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, function(response) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                resolve(response);
            }
        });
    });
}

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
    logEvent({message: "Loaded saved windows:", obj: windowsStorage}) // Log loaded windows
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message: ', err);
        });
    windowsStorage.forEach((window) => {
        const button = createWindowButton(window);
        windowList.appendChild(button);
    });
}

// Function to save a window to storage
function saveWindow(savedWindow) {
    // This checks if in the localStorage the current window is already saved based on the windowId
    const existingIndex = fetchIndex(savedWindow.id)

    if (existingIndex !== -1) {
        windowsStorage[existingIndex] = savedWindow;
    } else if (existingIndex === -1) {
        // Only save the window if it doesn't match the saved window being opened
        windowsStorage.push(savedWindow);
    }

    saveStorage();
    logEvent({message: "Saved window:", obj: savedWindow}) // Log saved window
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message: ', err);
        });

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

    const windowIdToOpen = savedWindow.windowId;
    logEvent({message: "window to open:", obj: savedWindow})
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message: ', err);
        });
    let openWindow = false;

    chrome.windows.getAll({ populate: false }, (windows) => {
        for (const window of windows) {
            const windowId = window.id;
            logEvent({message: "current window.id to check", obj: windowId})
                .then(r => {
                    console.log('Message successfully sent', r);
                })
                .catch(err => {
                    console.error('Error occurred while sending message: ', err);
                });
            if (windowIdToOpen === windowId) {
                openWindow = true;
                logEvent({message: "window id found in windows!:", obj: openWindow})
                    .then(r => {
                        console.log('Message successfully sent', r);
                    })
                    .catch(err => {
                        console.error('Error occurred while sending message: ', err);
                    });
            }
        }
        logEvent({message: "Is window currently open: ", obj: openWindow})
            .then(r => {
                console.log('Message successfully sent', r);
            })
            .catch(err => {
                console.error('Error occurred while sending message: ', err);
            });
        if (!openWindow) {
            // If the window does not exist, create a new window with the saved tabs
            const tabUrls = savedWindow.tabs.map((tab) => tab.url);
            chrome.windows.create({ url: tabUrls, focused: true }, (newWindow) => {
                // Update the saved window object with the new window ID
                windowsStorage[windowsStorage.findIndex(savedWindow)] = newWindow;
                logEvent({message: "Opened and saved window:", obj: newWindow})
                    .then(r => {
                        console.log('Message successfully sent', r);
                    })
                    .catch(err => {
                        console.error('Error occurred while sending message: ', err);
                    });
                saveStorage();
            });
        }
        else {
            // If the window is already open, you might want to focus on it or handle it differently.
            // You can add code here to focus on the existing window or handle this scenario.
            logEvent({ message: "Window is already open", obj: null})
                .then(r => {
                    console.log('Message successfully sent', r);
                })
                .catch(err => {
                    console.error('Error occurred while sending message: ', err);
                });

            // If the window ID is valid, simply focus it
            logEvent({message: "Focusing window:", obj: windowIdToOpen}) // Log focusing window
                .then(r => {
                    console.log('Message successfully sent', r);
                })
                .catch(err => {
                    console.error('Error occurred while sending message: ', err);
                });
            chrome.windows.update(windowIdToOpen, { focused: true })
                .then(r => {
                    console.log('Update successful', r);
                })
                .catch(err => {
                    console.error('Error occurred while opening window: ', err);
                });
        }
    });
}

// Function to delete a button for a saved window
function deleteSavedWindow(savedWindow) {
    loadStorage();
    // Find the index of the window to delete
    const windowIndex = fetchIndex(savedWindow.windowId)

    if (windowIndex !== -1) {
        // Remove the window from the saved windows list
        windowsStorage.splice(windowIndex, 1);
        logEvent({message: "Deleted window:", obj: savedWindow}) // Log deleted window
            .then(r => {
                console.log('Message successfully sent', r);
            })
            .catch(err => {
                console.error('Error occurred while sending message: ', err);
            });

        saveStorage();

        // Update the displayed list of saved windows in the popup
        updateWindowListUI();
    }
}

// Monitor all form of events for tab creation, deletion, and other modifications
chrome.tabs.onCreated.addListener(handleTabCreated);    //  callback => Tab object
chrome.tabs.onZoomChange.addListener(zoomChangeInfo => handleTabId(zoomChangeInfo.tabId));  //  callback => ZoomChangeInfo object [ newZoomFactor, oldZoomFactor, tabId, zoomSettings ]
chrome.tabs.onRemoved.addListener(handleTabId);    //  callback => tabId, removeInfo object [ isWindowClosing, windowId ]
chrome.tabs.onAttached.addListener(handleTabId);  //  callback => tabId, attachInfo object [ newPosition, newWindowId ]
chrome.tabs.onDetached.addListener(handleTabId);  //  callback => tabId, detachInfo object [ oldPosition, oldWindowId ]
chrome.tabs.onMoved.addListener(handleTabId);        //  callback => tabId, moveInfo object [ fromIndex, toIndex, windowId ]
chrome.tabs.onReplaced.addListener(handleTabId)   //  callback => addedTabId, removedTabId
chrome.tabs.onUpdated.addListener(handleTabId);    //  callback => tabId, changeInfo object [ All Tab object info besides windowId ]


function handleTabCreated(tab) {
    // Function to save the content if the tab's window is a saved window
    if (isSavedWindow(tab.windowId)) {
        fetchWindow(tab.windowId)
            .then(window => overwriteWindow(window))
            .catch(error => console.error('Error occurred while fetching Window: ', error));
    }
}

function handleTabId(tabId) {
    fetchTab(tabId)
        .then(tab => {
            if (isSavedWindow(tab.windowId)) {
                fetchWindow(tab.windowId)
                    .then(window => overwriteWindow(window))
                    .catch(error => console.error('Error occurred while fetching Window: ', error));
            }
        })
        .catch(error => {
            logEvent({message: "Error occurred: ", obj: error})
                .then(r => console.log('Message successfully sent', r))
                .catch(err => console.error('Error occurred while sending message: ', err));
        })
}

// Functions to perform tab modification updates
function fetchTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, function(tab) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                resolve(tab);
            }
        });
    });
}

function isSavedWindow(windowId) {
    let windowIndex = fetchIndex(windowId);
    return windowIndex !== -1;
}
function fetchWindow(windowId) {
    return new Promise((resolve, reject) => {
        chrome.windows.get(windowId, {populate: true}, function (window) {
            if (chrome.runtime.lastError) {
                logEvent({message: "Error: ", obj: chrome.runtime.lastError})
                    .then(r => {
                        console.log('Message successfully sent', r);
                    })
                    .catch(err => {
                        console.error('Error occurred while sending message: ', err);
                    });
                reject(chrome.runtime.lastError)
            } else {
                resolve(window);
            }
        });
    });
}

function fetchIndex(windowId) {
    let foundIndex = windowsStorage.findIndex((win) => win.id === windowId);
    logEvent({message: "Found at index: ", obj: foundIndex})
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message:', err);
        });
    return foundIndex;
}

function overwriteWindow(window) {
    const windowIndex = fetchIndex(window.id);
    windowsStorage[windowIndex] = window;
    logEvent({message:"Overwrite on saved window ", obj: window})
        .then(r => {
            console.log('Message successfully sent', r);
        })
        .catch(err => {
            console.error('Error occurred while sending message: ', err);
        });
    saveStorage();
}