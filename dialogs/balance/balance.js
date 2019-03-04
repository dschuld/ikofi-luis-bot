
const { ComponentDialog, WaterfallDialog, TextPrompt, NumberPrompt } = require('botbuilder-dialogs');
const axios = require('axios');

const { WalletData } = require('./walletData');
// Dialog IDs
const BALANCE_DIALOG = 'balanceDialog';
const CHANGE_PIN_DIALOG = 'changePin';

// Prompt IDs
const PIN_PROMPT = 'pinPrompt';
const CURRENT_PIN_PROMPT = 'currentPinPrompt';
const NEW_PIN_PROMPT = 'newPinPrompt';
const NEW_PIN_CONFIRM_PROMPT = 'confirmPinPrompt';

const VALIDATION_SUCCEEDED = true;

class BalanceDialog extends ComponentDialog {
    constructor(dialogId, walletAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!walletAccessor) throw ('Missing parameter.  walletAccessor is required');

        // Add a water fall dialog with 4 steps.
        // The order of step function registration is importent
        // as a water fall dialog executes steps registered in order
        this.addDialog(new WaterfallDialog(BALANCE_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptForPinStep.bind(this),
            this.displayBalanceStep.bind(this)
        ]));

        this.addDialog(new WaterfallDialog(CHANGE_PIN_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptForCurrentPinStep.bind(this),
            this.promptForNewPinStep.bind(this),
            this.promptForConfirmPinStep.bind(this),
            this.confirmNewPinStep.bind(this)

        ]));

        // Add text prompts for name and city
        this.addDialog(new NumberPrompt(PIN_PROMPT, this.validateName));

        // Save off our state accessor for later use
        this.walletAccessor = walletAccessor;

        this.walletClient = axios.create({
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            baseURL: 'https://df-alpha.bk.rw/wallet/',
            timeout: 15000
        });
    }

    /**
     * Waterfall Dialog step functions.
     *
     * Initialize our state.  See if the WaterfallDialog has state pass to it
     * If not, then just new up an empty UserProfile object
     *
     * @param {WaterfallStepContext} step contextual information for the current step being executed
     */
    async initializeStateStep(step) {
        let walletData = await this.walletAccessor.get(step.context);
        if (walletData === undefined) {
            if (step.options && step.options.walletData) {
                await this.walletAccessor.set(step.context, step.options.walletData);
            } else {
                // await this.walletAccessor.set(step.context, new WalletData('0360000004'));
            }
        }
        return await step.next();
    }

    async promptForPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (!walletData.pin) {
            // prompt for PIN, if missing
            return await step.prompt(PIN_PROMPT, 'Can you please tell me your PIN?');
        } else {
            return await step.next();
        }
    }

    async promptForCurrentPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (!walletData.pin) {
            // prompt for PIN, if missing
            return await step.prompt(CURRENT_PIN_PROMPT, 'Sure, in order to change your PIN, please tell me your current PIN first');
        } else {
            return await step.next();
        }
    }

    async promptForNewPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (!walletData.newPin) {
            // prompt for PIN, if missing
            return await step.prompt(NEW_PIN_PROMPT, 'Thanks, and what should your new PIN be?');
        } else {
            return await step.next();
        }
    }

    async promptForConfirmPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        return await step.prompt(NEW_PIN_CONFIRM_PROMPT, 'Thanks, and what should your new PIN be?');
    }

    async confirmNewPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (walletData.pin && walletData.newPin === walletData.confirmPin) {
            // call wallet API
        }
    }

    /**
     * Waterfall Dialog step functions.
     *
     * Having all the data we need, simply display a summary back to the user.
     *
     * @param {WaterfallStepContext} step contextual information for the current step being executed
     */
    async displayBalanceStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        const loginPayload = {
            username: walletData.walletNumber,
            pin: walletData.pin.toString()
        };

        try {
            await this.walletClient.post('login', loginPayload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-role': 'CUSTOMER'
                    }
                });
            const result = await this.walletClient.get('msisdn/' + walletData.walletNumber);
            await step.context.sendActivity('Your IKOFI balance is ' + result.data.wallet.defaultPocketBalance + ' Rwandan Francs');
        } catch (error) {
            await step.context.sendActivity('Sorry, your PIN is not correct.');
        }

        await step.context.sendActivity('Can I help you with something else?');

        walletData.pin = undefined;

        return await step.endDialog();
    }

    /**
     * Validator function to verify that user name meets required constraints.
     *
     * @param {PromptValidatorContext} validation context for this validator.
     */
    async validateName(validatorContext) {
        // // Validate that the user entered a minimum length for their name
        // const value = (validatorContext.recognized.value || '').trim();
        // if (value.length >= NAME_LENGTH_MIN) {
        return VALIDATION_SUCCEEDED;
        // } else {
        //     await validatorContext.context.sendActivity(`Names need to be at least ${ NAME_LENGTH_MIN } characters long.`);
        //     return VALIDATION_FAILED;
        // }
    }
}

class ChangePinDialog extends ComponentDialog {
    constructor(dialogId, walletAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!walletAccessor) throw ('Missing parameter.  walletAccessor is required');

        this.addDialog(new WaterfallDialog(CHANGE_PIN_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptForCurrentPinStep.bind(this),
            this.promptForNewPinStep.bind(this),
            this.promptForConfirmPinStep.bind(this),
            this.confirmNewPinStep.bind(this)

        ]));

        // Add text prompts for name and city
        // this.addDialog(new NumberPrompt(PIN_PROMPT, this.validateName));

        // Save off our state accessor for later use
        this.walletAccessor = walletAccessor;

        this.walletClient = axios.create({
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            baseURL: 'https://df-alpha.bk.rw/wallet/',
            timeout: 15000
        });
    }

    /**
     * Waterfall Dialog step functions.
     *
     * Initialize our state.  See if the WaterfallDialog has state pass to it
     * If not, then just new up an empty UserProfile object
     *
     * @param {WaterfallStepContext} step contextual information for the current step being executed
     */
    async initializeStateStep(step) {
        let walletData = await this.walletAccessor.get(step.context);
        if (walletData === undefined) {
            if (step.options && step.options.walletData) {
                await this.walletAccessor.set(step.context, step.options.walletData);
            } else {
                // await this.walletAccessor.set(step.context, new WalletData('0360000004'));
            }
        }
        return await step.next();
    }

    async promptForCurrentPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (!walletData.pin) {
            // prompt for PIN, if missing
            return await step.prompt(CURRENT_PIN_PROMPT, 'Sure, in order to change your PIN, please tell me your current PIN first');
        } else {
            return await step.next();
        }
    }

    async promptForNewPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (!walletData.newPin) {
            // prompt for PIN, if missing
            return await step.prompt(NEW_PIN_PROMPT, 'Thanks, and what should your new PIN be?');
        } else {
            return await step.next();
        }
    }

    async promptForConfirmPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        return await step.prompt(NEW_PIN_CONFIRM_PROMPT, 'Thanks, and what should your new PIN be?');
    }

    async confirmNewPinStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        // if we have everything we need, greet user and return
        // if (walletData !== undefined && walletData.pin !== undefined && walletData.walletNumber !== undefined) {
        //     return await this.greetUser(step);
        // }
        if (walletData.pin && walletData.newPin === walletData.confirmPin) {
            // call wallet API
        }
    }

    /**
     * Waterfall Dialog step functions.
     *
     * Having all the data we need, simply display a summary back to the user.
     *
     * @param {WaterfallStepContext} step contextual information for the current step being executed
     */
    async displayBalanceStep(step) {
        const walletData = await this.walletAccessor.get(step.context);
        const loginPayload = {
            username: walletData.walletNumber,
            pin: walletData.pin.toString()
        };

        try {
            await this.walletClient.post('login', loginPayload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-role': 'CUSTOMER'
                    }
                });
            const result = await this.walletClient.get('msisdn/' + walletData.walletNumber);
            await step.context.sendActivity('Your IKOFI balance is ' + result.data.wallet.defaultPocketBalance + ' Rwandan Francs');
        } catch (error) {
            await step.context.sendActivity('Sorry, your PIN is not correct.');
        }

        await step.context.sendActivity('Can I help you with something else?');

        walletData.pin = undefined;

        return await step.endDialog();
    }

    /**
     * Validator function to verify that user name meets required constraints.
     *
     * @param {PromptValidatorContext} validation context for this validator.
     */
    async validateName(validatorContext) {
        // // Validate that the user entered a minimum length for their name
        // const value = (validatorContext.recognized.value || '').trim();
        // if (value.length >= NAME_LENGTH_MIN) {
        return VALIDATION_SUCCEEDED;
        // } else {
        //     await validatorContext.context.sendActivity(`Names need to be at least ${ NAME_LENGTH_MIN } characters long.`);
        //     return VALIDATION_FAILED;
        // }
    }
}

exports.BalanceDialog = BalanceDialog;
exports.ChangePinDialog = ChangePinDialog;
