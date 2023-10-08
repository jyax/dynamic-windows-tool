




function saveWindow(savedWindow) {
    const windowData = localStorage.getItem( "windows");

    let windows = [];

    if (windowData) {
        windows = JSON.parse(windowData);
    }


}