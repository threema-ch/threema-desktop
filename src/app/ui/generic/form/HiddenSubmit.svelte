<!--
  In a form with multiple `input`s (type="text") we can't autosubmit via "Enter" keypress, unless
  this component is nested into the form.

  https://stackoverflow.com/a/27808062/4210443
 -->
<template>
  <input type="submit" />
</template>

<style lang="scss">
  input[type='submit'] {
    display: none;
  }
</style>
