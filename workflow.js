class WorkflowManager {
  // magic, random-ish delay values; they're somewhat cargo-culted in
  // and could likely be unified or refactored. They're based on
  // whatever happened to work when I was testing and not on any
  // research into how long the timeouts should be on a typical
  // machine+browser.
  static PLATFORM_RENDER_DELAY = 100;
  static NAVIGATION_RENDER_DELAY = 500;
  static #platformLocalStorageKey = "comp127-workflow-platform";

  #workflow = null;
  #currentStep = null;
  #stepHistory = [];
  #isNavigating = false; // Prevent double navigation
  #platform = null;
  #elements = {
    loading: document.getElementById("loading"),
    content: document.getElementById("workflowContent"),
    stepTitle: document.getElementById("stepTitle"),
    stepContent: document.getElementById("stepContent"),
    stepActions: document.getElementById("stepActions"),
  };

  constructor() {
    this.#setupBrowserNavigation();
  }

  startOverClick() {
    const newURL = `${window.location.origin}${window.location.pathname}?step=${this.#workflow.startStep}`;
    window.location.href = newURL;
  }

  #setupBrowserNavigation() {
    // Handle browser back/forward buttons
    window.addEventListener("popstate", (event) => {
      if (event.state?.step) {
        this.#isNavigating = true;
        this.#currentStep = event.state.step;
        this.#showStep(event.state.step, false); // Don't push to history
        this.#isNavigating = false;
      }
    });

    /* Handle #id bits in the URL so that we can load a workflow step
     * and jump to a particular sub-step / anchor:
     */
    window.addEventListener("load", () => {
      if (window.location.hash) {
        setTimeout(() => {
          document
            .getElementById(window.location.hash.substring(1))
            ?.scrollIntoView();
        }, WorkflowManager.NAVIGATION_RENDER_DELAY); // delay to ensure content is rendered
      }
    });
  }

  async #loadWorkflow() {
    try {
      const response = await fetch("workflow_config.json");
      if (!response.ok) {
        throw new Error(`Failed to load workflow config: ${response.status}`);
      }

      const config = await response.json();
      this.#workflow = config.workflow;
    } catch (error) {
      console.error("Error loading workflow:", error);
      this.showError(
        "Failed to load workflow configuration. Make sure workflow-config.json is available.",
      );
    }
  }

  #updatePlatformSpecificElements(platform) {
    setTimeout(() => {
      console.log(`updatePlatformSpecificElements, platform ${platform}`);
      const currentPlatformElements = document.getElementsByClassName(platform);
      console.log(
        `updatePlatformSpecificElements found ${currentPlatformElements.length} elements to update`,
      );
      for (const element of currentPlatformElements) {
        element.classList.remove("other-platform");
        element.classList.add("this-platform");
      }
    }, WorkflowManager.PLATFORM_RENDER_DELAY);
  }

  setPlatform(platform) {
    console.log(`Saving '${platform}' to local storage.`);
    this.#writePlatformToStorage(platform);
    this.#platform = platform;
    setTimeout(() => {
      this.#updatePlatformSpecificElements(platform);
    }, WorkflowManager.PLATFORM_RENDER_DELAY);
  }

  resetPlatform() {
    console.log(`Clearing local storage for platform`);
    localStorage.clear();
    this.#platform = null;
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
    }, WorkflowManager.NAVIGATION_RENDER_DELAY);
  }

  #showStep(stepId, pushToHistory = true) {
    const step = this.#workflow.steps[stepId];
    if (!step) {
      console.error(`Step ${stepId} not found`);
      this.showError(`Step "${stepId}" not found in workflow configuration.`);
      return;
    }

    this.#currentStep = stepId;

    // Update browser history (unless we're responding to back/forward)
    if (pushToHistory && !this.#isNavigating) {
      const url = new URL(window.location);
      url.searchParams.set("step", stepId);
      history.pushState({ step: stepId }, step.title, url.toString());
    }

    // FIXME what does the display block do?
    this.#elements.content.style.display = "block";

    // Update content
    this.#elements.stepTitle.textContent = step.title;
    if (step.contentFile) {
      fetch(step.contentFile)
        .then((response) => response.text())
        .then((content) => {
          this.#elements.stepContent.innerHTML = content;
        })
        .then(() => this.#updatePlatformSpecificElements(this.#platform))
        .then(() => {
          this.#renderActions(step.actions);
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch((error) =>
          console.error("Error loading HTML fragment: ", error),
        );
    } else {
      this.#elements.stepContent.innerHTML = step.content;
    }
  }

  #renderActions(actions) {
    this.#elements.stepActions.innerHTML = "";

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const backButton = this.#createBackButton();

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
        button.onclick = () => this.#handleAction(action);
        mainActions.appendChild(button);
      });

      buttonContainer.appendChild(mainActions);
    }

    this.#elements.stepActions.appendChild(buttonContainer);
  }

  #createBackButton() {
    if (this.#currentStep !== this.#workflow.startStep) {
      const backButton = document.createElement("button");
      backButton.classList.add("action-btn", "back-btn");
      backButton.textContent = "← Back";
      backButton.onclick = () => this.goBack();
      return backButton;
    }
  }

  #handleAction(action) {
    if (action.nextStep) {
      // Add current step to history for potential back navigation
      this.#stepHistory.push(this.#currentStep);

      // Add button click effect
      event.target.style.transform = "scale(0.95)";

      // Navigate to next step with a small delay for better UX
      setTimeout(() => {
        this.#showStep(action.nextStep);
      }, 150);
    }

    // Handle other action types if needed
    if (action.type === "external_link" && action.url) {
      window.open(action.url, "_blank");
    }
  }

  showError(message) {
    this.#elements.content.style.display = "block";
    this.#elements.stepTitle.textContent = "Error";
    this.#elements.stepContent.innerHTML = `
            <div class="reminder urgent">
                <strong>⚠️ Error:</strong><br>
                ${message}
            </div>
            <p>Please check that all files are properly set up and try refreshing the page.</p>
        `;
    this.#elements.stepActions.innerHTML = "";
  }

  // Method to go back to previous step
  goBack() {
    if (this.#stepHistory.length > 0) {
      const previousStep = this.#stepHistory.pop();
      this.#showStep(previousStep);
    }
  }

  enableButton(id) {
    const button = document.getElementById(id);
    if (button) {
      button.disabled = false;
      button.classList.remove("action-btn-disabled");
      button.classList.add("action-btn-enabled");
    }
  }

  // Method to restart workflow
  restart() {
    this.#stepHistory = [];
    this.#showStep(this.#workflow.startStep);
  }

  #readPlatformFromStorage() {
    // localStorage can be disabled or unavailable
    const platform = localStorage?.getItem(
      WorkflowManager.#platformLocalStorageKey,
    );
    console.log(`read ${platform} platform from localstorage`);
    return platform;
  }

  #writePlatformToStorage(platform) {
    try {
      localStorage.setItem(WorkflowManager.#platformLocalStorageKey, platform);
    } catch (e) {
      // Quota exceeded or storage unavailable
    }
  }

  init() {
    console.log("workflow init");
    this.#loadWorkflow().then(() => {
      const platform = this.#readPlatformFromStorage();
      if (!platform) {
        // not confident about full auto-detection, but if we are, add
        // back the detectPlatform function and do that here.
        console.log("No platform set in localStorage.");
      }
      this.#platform = platform;

      // Check if there's a step in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const stepFromUrl = urlParams.get("step");
      if (stepFromUrl && this.#workflow.steps[stepFromUrl]) {
        this.#showStep(stepFromUrl, false);
      } else {
        this.#showStep(this.#workflow.startStep);
      }
    });
  }
}

// Initialize the workflow when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.workflowManager = new WorkflowManager();
  window.workflowManager.init();
});

// Local Variables:
// eval: (subword-mode 1)
// End:
