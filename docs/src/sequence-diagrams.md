# Sequence Diagrams

This section shows sequence diagrams for a few core processes.

## App Initialization

```plantuml
@startuml
!theme plain
title App Initialization
hide footbox

box Frontend #eff4fc
  participant App
  actor User
  participant BackendController
endbox
box Backend #fcf2ef
  participant Backend
  participant KeyStorage
  participant Database
endbox
box Network #f0fcef
  participant RendezvousServer
  participant Directory
  participant Mediator
endbox

App->User:showLoadingScreen()
App->BackendController:create()
BackendController->Backend:BackendCreator.fromKeyStorage()

alt key storage not found
  Backend->BackendController:Error(no-identity)
  BackendController->User:showLinkingWizard()
  BackendController->Backend:BackendCreator.fromDeviceJoin()
  |||
  Backend->RendezvousServer:handshake()
  activate RendezvousServer
  Backend->User:showLinkingEmoji()
  Backend->RendezvousServer:runJoinProtocol()
  RendezvousServer->Backend:Blobs
  RendezvousServer->Backend:EssentialData
  |||
  Backend->Directory:validateIdentity()
  Backend->Database:createDatabase()
  Backend->Database:restoreEssentialData()
  |||
  Backend->User:requestPassword()
  Backend->User:showSyncingScreen()
  Backend->Mediator:register()
  Backend->KeyStorage:writeKeyStorage()
  Backend->RendezvousServer:complete()
  deactivate RendezvousServer
  Backend->User:showSuccessScreen()
else key storage found
  Backend->KeyStorage:loadKeyStorage()
  Backend->Database:loadDatabase()
end

App->User:showApplication()
@enduml
```

Source files:

- App: `src/app/app.ts`
- BackendController: `src/common/dom/backend.ts`
- Backend: `src/common/dom/backend.ts`
- KeyStorage: `src/common/node/key-storage/index.ts`
- Database: `src/common/node/db/sqlite.ts` and `src/common/db/in-memory.ts`

## Protocol Layers

```plantuml
@startuml
queue WebSocket
participant "1: Frame Layer" as 1
participant "2: Multiplex Layer" as 2
participant "3: Authentication and Transport Encryption Layer" as 3
participant "4: Connection Monitoring and Keepalive Layer" as 4
participant "5: End-to-End Layer" as 5

box "Task Manager" #LightBlue
queue "DecodeQueue" as TaskManagerDecodeQueue
control TaskManager

create TaskManagerDecodeQueue
TaskManager -> TaskManagerDecodeQueue: exposes

end box

note over WebSocket: Mediator Socket
/ note over 3: Handle CSP and D2M handshakes\n\t=>authentication state \nCSP transport encryption
/ note over 4: Send CSP echo requests and wait for replies
/ note over TaskManager: Process message\nhandle transactions\nhandle queues

== Decoding ==

note over 1: Decode bytes to d2m.container
/ note over 2: Demultiplex d2m.container to either\na D2M (protobuf) message, or\na CSP frame (type depending on auth state)
/ note over 3: CSP transport decryption\nDecode post-auth CSP payloads\nForward D2M messages
/ note over 5: Dispatch messages to\nTaskManager decode queue

WebSocket -> 1: ArrayBuffer
activate WebSocket
activate 1
1 -> 2: InboundL1Message
activate 2
2 -> 3: InboundL2Message
activate 3
3 -> 4: InboundL3Message
activate 4
4 -> 5: InboundL4Message
activate 5
5 -> TaskManagerDecodeQueue: InboundTaskMessage

deactivate WebSocket
deactivate 1
deactivate 2
deactivate 3
deactivate 4
deactivate 5

TaskManagerDecodeQueue <- TaskManager: Fetch Message (blocking)
return InboundTaskMessage

@enduml
```

## Model Store Lifecycle

```plantuml
@startuml
title Model Store Lifecycle
hide footbox

database Database order 90
database LocalModelStoreCache as Cache order 100
actor "API Consumer" as User order 0

== Create ==

' Load data
User -> Database : loadData()
activate Database
return (view, uid)
deactivate Database

' Instantiate model store
create LocalModelStore as Store order 10
User -> Store : new(view, uid)
activate Store

' Create model controller
create ModelController as Controller order 20
Store -> Controller : new(uid)

' Create lifetime guard
create ModelLifetimeGuard as Guard order 30
activate Controller
Controller -> Guard : new()
activate Guard

' Return values for model store
Guard --> Controller : lifetimeGuard
deactivate Guard
Controller --> Store : controller
deactivate Controller

' Activate lifetime guard
Store -> Guard : activate(getViewFn, updateFn)
note right : Activation of the lifetime guard exposes\nthe view and the update function of the\nmodel store towards the guard and\nthus indirectly to the controller.
activate Guard

' Return value for user
Store --> User : modelStore
deactivate Store

User -> Cache : add(modelStore)

|||

== Update ==

User -> Controller : updateValue(value)
activate Controller
Controller -> Guard : update(executorFn)
activate Guard
Guard -> Store : update(executorFn)
note left : The lifetime guard can only access the\nmodel store if it was activated.
activate Store
group Update Executor Function
  note over Store, Guard : The update executor function is passed in by the controller method. It receives\nthe current view and returns a changeset: meta.update((view) => /*changeset*/)
  Store -> Database : updateData(changeset)
  activate Database
  Database --> Store : OK
  deactivate Database
end
Store -> Store : setStoreValue()
Store -> Store : notifySubscribers()
Store --> Guard : OK
deactivate Store
Guard --> Controller : OK
deactivate Guard
Controller -> User : OK
deactivate Controller

|||

== Delete ==

User -> Controller : remove()
activate Controller
Controller -> Guard : deactivate(executorFn)
activate Guard
group Deactivate Executor Function
      note over Guard, Cache : The deactivate executor function is passed in by the controller method.\nAfter it runs, the controller will not be able to access the store anymore.
  Guard -> Database : remove(uid)
  activate Database
  Database --> Guard : OK
  deactivate Database
end

Guard -> Guard : deactivate()
Guard --> Controller : OK
deactivate Guard
deactivate Guard
Controller --> User : OK
deactivate Controller

@enduml
```
