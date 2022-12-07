# Releasing

## Preparation

Check for any vulnerabilities that need to be handled before the release:

    $ npm audit

## Version Bump

Set variables:

    $ export VERSION=X.Y.Z

Create a branch:

    $ git switch -c release-${VERSION}

Update version numbers (including version code):

    $ vim package.json
    $ npm install

Add a release entry to the Linux metainfo file:

    $ vim packaging/metadata/ch.threema.threema-desktop.metainfo.xml

Update changelog:

    $ vim CHANGELOG.md

Commit and push the version bump commit:

    $ git add -u
    $ git commit -m "Update version to v${VERSION}"
    $ git push origin release-${VERSION} -u

Now go ahead and create a merge request!

## Tag

Once the release MR is approved and merged, tag a release:

    $ git switch main
    $ git pull
    $ git tag -a v${VERSION} -m "Version ${VERSION}"
    $ git push --tags

The release artifacts will be built automatically.

Once the release artifacts are ready, update the release version JSON files on
the release server:

    $ ssh vs-es-ops3
    # cd /srv/www/releases/desktop-preview/
    # vim *.json

Finally:

- Update the internal Confluence documentation about the release
- Update the known issues page: FAQ-947
