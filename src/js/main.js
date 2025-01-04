class StepElement extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById('step-template').content;
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.appendChild(template.cloneNode(true));
    }
    
    set stepData(data) {
        this.shadowRoot.querySelector('h2').textContent = `${data.stepName}`;
        this.shadowRoot.querySelector('p').textContent = data.description;
    }
    
    get status() {
        return this.shadowRoot.querySelector('.status').value;
    }
    
    get comment() {
        return this.shadowRoot.querySelector('.comment').value;
    }
}

customElements.define('step-element', StepElement);

const fileInput = document.getElementById('file-input');
const loadButton = document.querySelector('.load-button');
const content = document.getElementById('content');
const statsBody = document.getElementById('stats-body');
const statistics = document.getElementById('statistics');
let tests = [];
let currentTestIndex = 0;
let currentStepIndex = 0;

loadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            tests = data.Tests;
            showTestProcedure(data);
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file to load');
    }
});

function showTestProcedure(data) {
    content.innerHTML = `
        <h2>${data["Test Prodcedure"]}</h2>
        <p><strong>Updated:</strong> ${data.Updated}</p>
        <p><strong>Author:</strong> ${data.Author}</p>
        <p><strong>Description:</strong> ${data.Description}</p>
        <button id="continue-button">Continue</button>
    `;
    document.getElementById('continue-button').addEventListener('click', () => {
        showTest(currentTestIndex);
    });
}

function showTest(index) {
    if (index < tests.length) {
        const test = tests[index];
        
        //Collect and handle variables
        collectVariables(test).then(() => {
            const preconditions = test["Test Preconditions"].map(replaceVariables);
            const postconditions = test["Test Postconditions"].map(replaceVariables);
            
            content.innerHTML = `
            <h2>${test["Test Name"]}</h2>
            <p><strong>Preconditions:</strong></p>
            <ul>${preconditions.map(cond => `<li>${cond}</li>`).join('')}</ul>
            <p><strong>Postconditions:</strong></p>
            <ul>${postconditions.map(cond => `<li>${cond}</li>`).join('')}</ul>
            <button id="begin-button">Begin</button>
            `;
            
            document.getElementById('begin-button').addEventListener('click', () => {
                showStep(0);
            });
        });
    } else {
        showStatistics();
    }
}

function showStep(index) {
    content.innerHTML = '';
    if (index < tests[currentTestIndex]["Test Steps"].length) {
        const stepElement = document.createElement('step-element');
        //Handle any variable replacing in the step description
        const stepData = {...tests[currentTestIndex]["Test Steps"][index]};
        stepData.description = replaceVariables(stepData.description);
        stepElement.stepData = stepData;
        content.innerHTML = `<h2>${tests[currentTestIndex]["Test Name"]}</h2>`;
        content.appendChild(stepElement);
        
        const nextButton = stepElement.shadowRoot.querySelector('.next-step');
        const terminateButton = stepElement.shadowRoot.querySelector('.terminate-run');
        nextButton.addEventListener('click', () => {
            recordStepStatus(stepElement);
            showStep(index + 1);
        });
        terminateButton.addEventListener('click', () => {
            recordStepStatus(stepElement);
            showStatistics();
        });
    } else {
        currentTestIndex++;
        currentStepIndex = 0;
        showTest(currentTestIndex);
    }
}

function recordStepStatus(stepElement) {
    tests[currentTestIndex]["Test Steps"][currentStepIndex].status = stepElement.status;
    tests[currentTestIndex]["Test Steps"][currentStepIndex].comment = stepElement.comment;
    currentStepIndex++;
}

function showStatistics() {
    content.innerHTML = '';
    content.appendChild(statistics);
    statistics.classList.remove('hidden');
    const table_body = statsBody.querySelector('tbody');
    table_body.innerHTML = '';
    let passCount = 0;
    tests.forEach(test => {
        test["Test Steps"].forEach(step => {
            if (step.status === 'Pass') {
                passCount++;
            }
        });
    });
    const passRate = (passCount / tests.reduce((acc, test) => acc + test["Test Steps"].length, 0)) * 100;
    const summary = document.createElement('div');
    summary.innerHTML = `
        <h2>Test Run Summary</h2>
        <p>Pass Rate: ${passRate.toFixed(2)}%</p>
        <button id="toggle-details">Show Details</button>
    `;
    content.appendChild(summary);
    
    const details = document.createElement('div');
    details.id = 'details';
    details.classList.add('hidden');
    const testHeader = document.createElement('tr');
    testHeader.innerHTML = '<th colspan="3">Tests Run</th>';
    statsBody.appendChild(testHeader);
    tests.forEach((test, testIndex) => {
        const testRow = document.createElement('tr');
        const testStatus = test["Test Steps"].some(step => step.status === 'Fail') ? 'Fail' : test["Test Steps"].some(step => step.status === undefined) ? 'not-run' : 'Pass';
        const overallStatus = testStatus === 'Pass' ? 'Pass' : testStatus === 'Fail' ? 'Fail' : 'Not Run';
        testRow.classList.add(testStatus === 'Pass' ? 'pass' : testStatus === 'not-run' ? 'not-run' : 'fail');
        testRow.classList.add('test-details');
        testRow.innerHTML = `
            <td>${test["Test Name"]}</td>
            <td>${overallStatus}</td>
            <td><button class="toggle-steps">Show Steps</button></td>
        `;
        statsBody.appendChild(testRow);
        
        const stepContainer = document.createElement('div');
        stepContainer.classList.add('step-container');
        const stepTable = document.createElement('table');
        const testHeaderRow = document.createElement('tr');
        testHeaderRow.innerHTML = `
                <th>Step</th>
                <th>Status</th>
                <th>Comment</th>
            `;
        Array.from(testHeaderRow.children).forEach((child)=>{child.classList.add('test-step-header');});
        stepTable.appendChild(testHeaderRow);
        test["Test Steps"].forEach((step) => {
            const stepStatus = step.status !== undefined ? step.status : 'Not Applicable';
            const stepComment = step.comment !== undefined ? step.comment : 'Not Applicable';
            const stepRow = document.createElement('tr');
            stepRow.classList.add('step-details');
            stepRow.classList.add(stepStatus === 'Fail' ? 'fail' :  stepStatus === 'Pass' ? 'pass' : 'not-run');
            stepRow.innerHTML = `
                    <td>${step.stepName}</td>
                    <td>${stepStatus}</td>
                    <td>${stepComment}</td>
                `;
            stepTable.appendChild(stepRow);
        });
        stepContainer.appendChild(stepTable);
        const stepTableRow = document.createElement('tr');
        stepTableRow.appendChild(document.createElement('td'));
        stepTableRow.querySelector('td').colSpan = 3;
        stepTableRow.querySelector('td').appendChild(stepContainer);
        stepTableRow.classList.add('hidden')
        statsBody.appendChild(stepTableRow);
        
        testRow.querySelector('.toggle-steps').addEventListener('click', () => {
            stepTableRow.classList.toggle('hidden');
            const button = testRow.querySelector('.toggle-steps');
            button.textContent = stepTableRow.classList.contains('hidden') ? 'Show Steps' : 'Hide Steps';
        });
    });
    details.appendChild(statsBody);
    content.appendChild(details);
    
    document.getElementById('toggle-details').addEventListener('click', () => {
        details.classList.toggle('hidden');
        const button = document.getElementById('toggle-details');
        button.textContent = details.classList.contains('hidden') ? 'Show Details' : 'Hide Details';
    });
}

//Handle variables in tests
const testVariables = new Map();

function collectVariables(test) {
    if (!test["Test Variables"]){
        //This test has no variables
        return Promise.resolve();
    }
    
    const form = document.createElement('div');
    form.innerHTML = `
        <h3>This test requires the following values:</h3>
        <form id="variable-form">
            ${test["Test Variables"].map(variable => `
                <label for="${variable}">${variable}</label>
                <input type="text" name="${variable}" id="${variable}" required>
            `).join('')}
            <button type="submit">Continue</button>
        </form>
    `;
    
    content.innerHTML = '';
    content.appendChild(form);  
    
    return new Promise((resolve) => {
        document.getElementById('variable-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            testVariables.clear();
            for (const pair of formData.entries()) {
                testVariables.set(pair[0], pair[1]);
            }
            resolve();
        });
    });
}

function replaceVariables(text) {
    if (!text){
        //Input is null or undefined
        return text;
    }
    return text.replace(/{{(\w+)}}/g, (match, variable) => {
        return testVariables.get(variable) || match;
    });
}

