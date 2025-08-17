class WorkflowManager {
  constructor() {
    this.workflow = null;
    this.currentStep = null;
    this.stepHistory = [];
    this.stepOrder = []; // Will be populated based on workflow structure
    this.isNavigating = false; // Prevent double navigation
    this.elements = {
      loading: document.getElementById("loading"),
      content: document.getElementById("workflowContent"),
      stepTitle: document.getElementById("stepTitle"),
      stepContent: document.getElementById("stepContent"),
      stepActions: document.getElementById("stepActions"),
    };

    this.setupBrowserNavigation();
  }

  setupBrowserNavigation() {
    // Handle browser back/forward buttons
    window.addEventListener("popstate", (event) => {
      if (event.state && event.state.step) {
        this.isNavigating = true;
        this.currentStep = event.state.step;
        this.showStep(event.state.step, false); // Don't push to history
        this.isNavigating = false;
      }
    });

    /* Handle #id bits in the URL so that we can load a workflow step
     * and jump to a particular sub-step / anchor:
     */
    window.addEventListener("load", function () {
      if (window.location.hash) {
        setTimeout(function () {
          document
            .getElementById(window.location.hash.substring(1))
            ?.scrollIntoView();
        }, 1000); // delay to ensure content is rendered
      }
    });
  }

  async loadWorkflow() {
    try {
      const response = await fetch("workflow_config.json");
      if (!response.ok) {
        throw new Error(`Failed to load workflow config: ${response.status}`);
      }

      const config = await response.json();
      this.workflow = config.workflow;
    } catch (error) {
      console.error("Error loading workflow:", error);
      this.showError(
        "Failed to load workflow configuration. Make sure workflow-config.json is available.",
      );
    }
  }

  showStep(stepId, pushToHistory = true) {
    const step = this.workflow.steps[stepId];
    if (!step) {
      console.error(`Step ${stepId} not found`);
      this.showError(`Step "${stepId}" not found in workflow configuration.`);
      return;
    }

    this.currentStep = stepId;

    // Update browser history (unless we're responding to back/forward)
    if (pushToHistory && !this.isNavigating) {
      const url = new URL(window.location);
      url.searchParams.set("step", stepId);
      history.pushState({ step: stepId }, step.title, url.toString());
    }

    // FIXME what does the display block do?

    // Hide loading, show content
    this.elements.content.style.display = "block";

    // Update content
    this.elements.stepTitle.textContent = step.title;
    if (step.contentFile) {
      fetch(step.contentFile)
        .then((response) => response.text())
        .then((content) => {
          this.elements.stepContent.innerHTML = content;
        })
        .catch((error) =>
          console.error("Error loading HTML fragment: ", errors),
        );
    } else {
      this.elements.stepContent.innerHTML = step.content;
    }

    // Update actions (now includes back button)
    this.renderActions(step.actions);

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderActions(actions) {
    this.elements.stepActions.innerHTML = "";

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    let backButton = null;

    // Add back button when not on first step
    if (this.currentStep !== this.workflow.startStep) {
      backButton = document.createElement("button");
      backButton.className = "action-btn back-btn";
      backButton.textContent = "← Back";
      backButton.onclick = () => this.goBack();
    }

    // Add main action buttons
    if (actions && actions.length > 0) {
      const mainActions = document.createElement("div");
      mainActions.className = "main-actions";

      if (backButton) {
        mainActions.appendChild(backButton);
      }

      actions.forEach((action) => {
        const button = document.createElement("button");
        button.className = "action-btn-enabled action-btn";
        button.textContent = action.label;
        button.id = action.label;
        if (action.startDisabled) {
          button.disabled = true;
          button.className = "action-btn action-btn-disabled";
        }
        button.onclick = () => this.handleAction(action);
        mainActions.appendChild(button);
      });

      buttonContainer.appendChild(mainActions);
    }

    this.elements.stepActions.appendChild(buttonContainer);
  }

  handleAction(action) {
    if (action.nextStep) {
      // Add current step to history for potential back navigation
      this.stepHistory.push(this.currentStep);

      // Add button click effect
      event.target.style.transform = "scale(0.95)";

      // Navigate to next step with a small delay for better UX
      setTimeout(() => {
        this.showStep(action.nextStep);
      }, 150);
    }

    // Handle other action types if needed
    if (action.type === "external_link" && action.url) {
      window.open(action.url, "_blank");
    }
  }

  showError(message) {
    this.elements.content.style.display = "block";
    this.elements.stepTitle.textContent = "Error";
    this.elements.stepContent.innerHTML = `
            <div class="reminder urgent">
                <strong>⚠️ Error:</strong><br>
                ${message}
            </div>
            <p>Please check that all files are properly set up and try refreshing the page.</p>
        `;
    this.elements.stepActions.innerHTML = "";
  }

  // Method to go back to previous step
  goBack() {
    if (this.stepHistory.length > 0) {
      const previousStep = this.stepHistory.pop();
      this.showStep(previousStep);
    }
  }

  enableButton(id) {
    const button = document.getElementById(id);
    button.disabled = false;
    button.className = "action-btn action-btn-enabled";
  }

  // Method to restart workflow
  restart() {
    this.stepHistory = [];
    this.showStep(this.workflow.startStep);
  }

  init() {

    // FIXME can we just make the delay 0 or very small?
    // and does this interact with the other # id handling timer?

    // Load workflow after a brief delay to show loading state
    setTimeout(() => {
      this.loadWorkflow().then(() => {
        // Check if there's a step in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const stepFromUrl = urlParams.get("step");

        if (stepFromUrl && this.workflow.steps[stepFromUrl]) {
          this.showStep(stepFromUrl, false);
        } else {
          this.showStep(this.workflow.startStep);
        }
      });
    }, 300);
  }
}

// Initialize the workflow when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const workflow = new WorkflowManager();
  workflow.init();
});

window.workflowManager = new WorkflowManager();
