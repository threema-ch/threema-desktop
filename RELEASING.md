# Releasing

## 1. Preparation

Check for any vulnerabilities that need to be handled before the release:

    $ npm audit

## 2. Version Bump

We always bump the version on `develop` through a merge request.

Set variables:

    $ export VERSION=X.Y.Z

Create a branch:

    $ git switch -c release-${VERSION}

Update version numbers (including version code):

    $ vim package.json
    $ npm install

Update release notes (page "4 Threema Desktop 2.0 (Preview)") on Confluence.

Update changelogs:

    $ vim CHANGELOG.md  # Internal release notes
    $ vim packaging/metadata/ch.threema.threema-desktop.metainfo.xml  # Public release notes

Commit and push the version bump commit:

    $ git add -u
    $ git commit -m "Update version to v${VERSION}"
    $ git push origin release-${VERSION} -u

Now go ahead and create a merge request against `develop` and get it reviewed and merged!

## 3. Merge `develop` into `stable`

Our merge policy on GitLab is "fast forward only", but once the histories of `stable` and `develop`
have diverged, we will always need a merge commit to be able to merge `develop` into `stable`. For
this, we create a temporary branch that contains the merge commit, and then merge that into `stable`
using a merge request.

Create the temporary branch `stable-${VERSION}` based on `stable`:

    $ git fetch origin
    $ git switch -c stable-${VERSION} origin/stable

Merge `develop` into this branch using a merge commit:

    $ git merge --no-ff origin/develop -m "Merge branch develop at v${VERSION} into stable"

Push the temporary branch to GitLab:

    $ git push origin stable-${VERSION} -u

Now create a merge request from `stable-${VERSION}` against `stable`. As MR title, use the message
of the merge commit.

Merge the MR once CI succeeds.

## 4. Tag on `stable`

Once the merge MR is approved and merged, tag a release on the `stable` branch to trigger the
creation of the release artifacts:

    $ git switch stable
    $ git pull
    $ git tag -a v${VERSION} -m "Version ${VERSION}"
    $ git push --tags

The release artifacts will be built automatically.

After the Windows build is ready, sign it manually.

## 5. Internal Testing

- Update the internal Confluence documentation about the release
- Update the known issues page: FAQ-947
- Announce the release internally and test it

## 6. Publication

Copy the artifacts from the internal location to the public location.

Once the release artifacts are ready, update the release version JSON files on the release server:

    $ ssh vs-es-ops3
    # cd /srv/www/releases/desktop/
    # vim -p latest-version-*.json

Publish the release notes on the Threema website.
