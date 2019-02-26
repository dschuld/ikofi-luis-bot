// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Simple user profile class.
 */
class UserProfile {
    constructor(walletNumber, pin) {
        this.walletNumber = walletNumber || undefined;
        this.pin = pin || undefined;
    }
};

exports.UserProfile = UserProfile;
