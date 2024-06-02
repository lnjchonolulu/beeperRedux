document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.dial-button');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const callButton = document.querySelector('.call-button');
    const backspaceButton = document.querySelector('.backspace-button');

    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const number = button.getAttribute('data-number');
            phoneNumberInput.value += number;
        });
    });

    backspaceButton.addEventListener('click', function() {
        phoneNumberInput.value = phoneNumberInput.value.slice(0, -1);
    });

    callButton.addEventListener('click', function() {
        if (phoneNumberInput.value !== '') {
            const dialedBeeperNumber = phoneNumberInput.value;
            console.log(`Calling beeper number: ${dialedBeeperNumber}`);
            // Custom event to notify map.js
            const event = new CustomEvent('callBeeper', { detail: dialedBeeperNumber });
            document.dispatchEvent(event);
            phoneNumberInput.value = '';
        } else {
            alert('Please enter a phone number.');
        }
    });
});