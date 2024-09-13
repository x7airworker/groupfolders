/* eslint-disable jsdoc/require-jsdoc */
/**
 * @copyright Copyright (c) 2022 Louis Chemineau <louis@chmn.me>
 *
 * @author Louis Chemineau <louis@chmn.me>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

import type { User } from '@nextcloud/cypress'
import { addUserToGroup, createGroup, createGroupFolder, PERMISSION_DELETE, PERMISSION_READ, PERMISSION_WRITE } from '../groupfoldersUtils'
import { navigateToFolder } from '../files/filesUtils'

type SetupInfo = {
	dataSnapshot: string
	dbSnapshot: string
	groupName: string
	groupFolderName: string
	fileName: string
	filePath: string
	user: User
}

export function setupFilesVersions(): Cypress.Chainable<SetupInfo> {
	return cy.task('getVariable', { key: 'files-versions-data' })
		.then((_setupInfo) => {
			const setupInfo = _setupInfo as SetupInfo || {}

			if (setupInfo.dataSnapshot && setupInfo.dbSnapshot) {
				cy.restoreDB(setupInfo.dbSnapshot)
				cy.restoreData(setupInfo.dataSnapshot)
			} else {
				setupInfo.groupName = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 10)
				setupInfo.groupFolderName = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 10)
				setupInfo.fileName = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 10) + '.txt'
				setupInfo.filePath = `${setupInfo.groupFolderName}/${setupInfo.fileName}`

				cy.createRandomUser().then(_user => { setupInfo.user = _user })
				createGroup(setupInfo.groupName)

				cy.then(() => {
					addUserToGroup(setupInfo.groupName, setupInfo.user.userId)
					createGroupFolder(setupInfo.groupFolderName, setupInfo.groupName, [PERMISSION_READ, PERMISSION_WRITE, PERMISSION_DELETE])

					uploadThreeVersions(setupInfo.user, setupInfo.filePath)
				})
					.then(() => cy.backupDB().then((value) => { setupInfo.dbSnapshot = value }))
					.then(() => cy.backupData([setupInfo.user.userId]).then((value) => { setupInfo.dataSnapshot = value }))
					.then(() => cy.task('setVariable', { key: 'files-versions-data', value: setupInfo }))
			}

			return cy.then(() => {
				cy.login(setupInfo.user)
				cy.visit('/apps/files')
				navigateToFolder(setupInfo.groupFolderName)
				openVersionsPanel(setupInfo.filePath)
				return cy.wrap(setupInfo)
			})
		})
}

export const uploadThreeVersions = (user: User, fileName: string) => {
	// A new version will not be created if the changes occur
	// within less than one second of each other.
	// eslint-disable-next-line cypress/no-unnecessary-waiting
	cy.uploadContent(user, new Blob(['v1'], { type: 'text/plain' }), 'text/plain', `/${fileName}`)
		.wait(1100)
		.uploadContent(user, new Blob(['v2'], { type: 'text/plain' }), 'text/plain', `/${fileName}`)
		.wait(1100)
		.uploadContent(user, new Blob(['v3'], { type: 'text/plain' }), 'text/plain', `/${fileName}`)
	cy.login(user)
}

export function openVersionsPanel(fileName: string) {
	// Detect the versions list fetch
	cy.intercept({ method: 'PROPFIND', times: 1, url: '**/dav/versions/*/versions/**' }).as('getVersions')

	// Open the versions tab
	cy.window().then(win => {
		win.OCA.Files.Sidebar.setActiveTab('version_vue')
		win.OCA.Files.Sidebar.open(`/${fileName}`)
	})

	// Wait for the versions list to be fetched
	cy.wait('@getVersions')
	cy.get('#tab-version_vue').should('be.visible', { timeout: 10000 })
}

export function toggleVersionMenu(index: number) {
	cy.get('#tab-version_vue [data-files-versions-version]')
		.eq(index)
		.find('button')
		.click()
}

export function triggerVersionAction(index: number, actionName: string) {
	toggleVersionMenu(index)
	cy.get(`[data-cy-files-versions-version-action="${actionName}"]`).filter(':visible').click()
}

export function nameVersion(index: number, name: string) {
	cy.intercept({ method: 'PROPPATCH', times: 1, url: '**/dav/versions/*/versions/**' }).as('labelVersion')
	triggerVersionAction(index, 'label')
	cy.get(':focused').type(`${name}{enter}`)
	cy.wait('@labelVersion')
	cy.get('.modal-mask').should('not.be.visible')
}

export function restoreVersion(index: number) {
	cy.intercept({ method: 'MOVE', times: 1, url: '**/dav/versions/*/versions/**' }).as('restoreVersion')
	triggerVersionAction(index, 'restore')
	cy.wait('@restoreVersion')
}

export function deleteVersion(index: number) {
	cy.intercept({ method: 'DELETE', times: 1, url: '**/dav/versions/*/versions/**' }).as('deleteVersion')
	triggerVersionAction(index, 'delete')
	cy.wait('@deleteVersion')
}

export function doesNotHaveAction(index: number, actionName: string) {
	toggleVersionMenu(index)
	cy.get(`[data-cy-files-versions-version-action="${actionName}"]`).should('not.exist')
	toggleVersionMenu(index)
}

export function assertVersionContent(index: number, expectedContent: string) {
	cy.intercept({ method: 'GET', times: 1, url: 'remote.php/**' }).as('downloadVersion')
	triggerVersionAction(index, 'download')
	cy.wait('@downloadVersion')
		.then(({ response }) => expect(response?.body).to.equal(expectedContent))
}
