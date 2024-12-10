window.loggedIn = false; // Set the initial value as needed

async function checkLoggedIn() {
    try {
        const response = await fetch('/checkLoginStatus'); // A route to check login status

        if (response.ok) {
            const { loggedIn } = await response.json();
            window.loggedIn = loggedIn;
            console.log(window.loggedIn); // Log the updated value here
        } else {
            console.error('Error checking login status');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLoggedIn();
