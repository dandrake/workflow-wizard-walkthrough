// TODO: use classList.add and remove, https://www.w3schools.com/jsref/prop_element_classlist.asp
class WorkflowManager {
  constructor() {
    this.workflow = null;
    this.currentStep = null;
    this.stepHistory = [];
    this.stepOrder = []; // Will be populated based on workflow structure
    this.isNavigating = false; // Prevent double navigation
    this.platform = null;
    this.platformLocalStorageKey = "comp127-workflow-platform";

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
        }, 500); // delay to ensure content is rendered
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

  updatePlatformSpecificElements(platform) {
    console.log(`updatePlatformSpecificElements, platform ${platform}`);
    const currentPlatformElements = document.getElementsByClassName(platform);
    for (var i = 0; i < currentPlatformElements.length; i++) {
      currentPlatformElements[i].classList.remove("other-platform");
      currentPlatformElements[i].classList.add("this-platform");
    }
  }

  setPlatform(platform) {
    console.log(`Saving '${platform}' to local storage.`);
    this.writePlatformToStorage(platform);
    setTimeout(() => {
      this.updatePlatformSpecificElements(platform);
    }, 500);
  }

  resetPlatform() {
    console.log(`Clearing local storage for platform`);

    localStorage.clear();
    setTimeout(() => {
      // I wanted to use document.getElementsByClassName, but that
      // returns an object that updates "live", so if you remove the
      // this-platform class while iterating, you're mutating the
      // collection and can run into trouble. There are ways to work
      // with that, but it's simpler to just use querySelectorAll, which
      // returns a static, unchanging collection, namely a NodeList:
      //
      // https://www.w3schools.com/js/js_htmldom_nodelist.asp
      // https://www.w3schools.com/jsref/met_element_queryselectorall.asp
      //
      // versus the classname version and DOMTokenList:
      //
      // https://www.w3schools.com/jsref/dom_obj_html_domtokenlist.asp
      // https://www.w3schools.com/jsref/prop_element_classlist.asp
      const currentPlatformElements =
        document.querySelectorAll(".this-platform");
      for (const element of currentPlatformElements) {
        element.classList.replace("this-platform", "other-platform");
      }
    }, 500);
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
    // this.elements.loading.classList.remove("show");

    // FIXME: what does this do?
    this.elements.content.style.display = "block";

    // Update content
    this.elements.stepTitle.textContent = step.title;
    if (step.contentFile) {
      fetch(step.contentFile)
        .then((response) => response.text())
        .then((content) => {
          this.elements.stepContent.innerHTML = content;
        })
        .then(this.updatePlatformSpecificElements(this.platform))
        .catch((error) =>
          console.error("Error loading HTML fragment: ", error),
        );
    } else {
      this.elements.stepContent.innerHTML = step.content;
    }

    this.renderActions(step.actions);
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
      backButton.classList.add("action-btn", "back-btn");
      backButton.textContent = "← Back";
      backButton.onclick = () => this.goBack();
    }

    // Add main action buttons
    if (actions && actions.length > 0) {
      const mainActions = document.createElement("div");
      mainActions.classList.add("main-actions");

      if (backButton) {
        mainActions.appendChild(backButton);
      }

      actions.forEach((action) => {
        const button = document.createElement("button");
        button.classList.add("action-btn", "action-btn-enabled");
        button.textContent = action.label;
        button.id = action.label;
        if (action.startDisabled) {
          button.disabled = true;
          button.classList.add("action-btn-disabled");
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
    button.classList.remove("action-btn-disabled");
    button.classList.add("action-btn-enabled");
  }

  // Method to restart workflow
  restart() {
    this.stepHistory = [];
    this.showStep(this.workflow.startStep);
  }

  detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isMac = /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua);
    const isWin = /Win/i.test(platform) || /Windows/i.test(ua);
    const isLinux = /Linux/i.test(platform) || /Linux/i.test(ua);
    if (isMac) return "mac";
    if (isWin) return "windows";
    if (isLinux) return "linux";
    return "other";
  }

  debugOS() {
    const ua = navigator.userAgent || "no userAgent";
    const platform = navigator.platform || "no platform";

    return `userAgent: ${ua}\nplatform: ${platform}`;
  }

  readPlatformFromStorage() {
    try {
      return localStorage.getItem(this.platformLocalStorageKey); // string or null
    } catch (e) {
      // localStorage can be disabled or unavailable in some contexts
      return null;
    }
  }

  writePlatformToStorage(os) {
    try {
      localStorage.setItem(this.platformLocalStorageKey, os);
    } catch (e) {
      // Quota exceeded or storage unavailable
    }
  }

  init() {
    // Show loading initially
    // this.elements.loading.classList.add("show");
    // Load workflow after a brief delay to show loading state
    this.loadWorkflow().then(() => {
      let platform = this.readPlatformFromStorage();
      if (!platform) {
        // not confident about full auto-detection, but if we are...
        // platform = this.detectPlatform();
        // this.writePlatformToStorage(platform);
      }
      this.platform = platform;

      // Check if there's a step in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const stepFromUrl = urlParams.get("step");
      if (stepFromUrl && this.workflow.steps[stepFromUrl]) {
        this.showStep(stepFromUrl, false);
      } else {
        this.showStep(this.workflow.startStep);
      }
    });
  }
}
// Initialize the workflow when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const workflow = new WorkflowManager();
  workflow.init();
});

window.workflowManager = new WorkflowManager();

function enableButton(id) {
  const button = document.getElementById(id);
  button.disabled = false;
  button.className = "action-btn action-btn-enabled";
}

// Local Variables:
// eval: (subword-mode 1)
// End:
